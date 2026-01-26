import subprocess
import time
import os
import signal

# Caminhos dos scripts
RAG_SCRIPT = "rag_api.py"
CREW_SCRIPT = "crew_server.py"
SELFTEST_SCRIPT = "frontend_rag_selftest.py"

# Logs temporários
RAG_LOG = "/tmp/rag_api.log"
CREW_LOG = "/tmp/crew.log"

def start_process(script, log_file):
    print(f"🚀 Starting {script}...")
    with open(log_file, "w") as f:
        proc = subprocess.Popen(
            ["python", script],
            stdout=f,
            stderr=subprocess.STDOUT,
            preexec_fn=os.setsid
        )
    return proc

def check_health(url, retries=5, delay=3):
    import requests
    for i in range(retries):
        try:
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                return True
        except:
            pass
        time.sleep(delay)
    return False

def main():
    # Limpar logs antigos
    if os.path.exists(RAG_LOG): os.remove(RAG_LOG)
    if os.path.exists(CREW_LOG): os.remove(CREW_LOG)

    # 1️⃣ Iniciar RAG API
    rag_proc = start_process(RAG_SCRIPT, RAG_LOG)
    print("⏳ Waiting for RAG API to be ready...")
    time.sleep(15)  # Ajuste se embeddings forem grandes
    if not check_health("http://127.0.0.1:8000/health"):
        print("❌ RAG API failed to start. Check logs:", RAG_LOG)
        return

    # 2️⃣ Iniciar CrewAI
    crew_proc = start_process(CREW_SCRIPT, CREW_LOG)
    print("⏳ Waiting for CrewAI to be ready...")
    time.sleep(5)
    if not check_health("http://127.0.0.1:9000/health"):
        print("❌ CrewAI failed to start. Check logs:", CREW_LOG)
        return

    # 3️⃣ Rodar Self-Test
    print("🔍 Running Self-Test...")
    subprocess.run(["python", SELFTEST_SCRIPT])

    # 4️⃣ Exibir logs resumidos (primeiras linhas)
    print("\n=== RAG API log sample ===")
    with open(RAG_LOG) as f:
        print("".join(f.readlines()[:20]))

    print("\n=== CrewAI log sample ===")
    with open(CREW_LOG) as f:
        print("".join(f.readlines()[:20]))

    print("\n✅ Self-Test completed!")

    # 5️⃣ Opcional: manter processos rodando ou finalizar
    try:
        os.killpg(os.getpgid(rag_proc.pid), signal.SIGTERM)
    except:
        pass
    try:
        os.killpg(os.getpgid(crew_proc.pid), signal.SIGTERM)
    except:
        pass

if __name__ == "__main__":
    main()
