import DiagnosticForm from '../DiagnosticForm';

export default function DiagnosticFormExample() {
  const handleSubmit = (data: any) => {
    console.log("Form submitted:", data);
  };

  return (
    <div className="p-8 max-w-2xl">
      <DiagnosticForm onSubmit={handleSubmit} />
    </div>
  );
}
