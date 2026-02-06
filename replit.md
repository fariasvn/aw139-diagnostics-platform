# AW139 Smart Troubleshooting Assistant

## Overview

The AW139 Smart Troubleshooting Assistant is an AI-powered diagnostic system for AW139 helicopter maintenance. The application provides mechanics with intelligent troubleshooting guidance, RAG-based analysis, certainty scoring, and expert support capabilities. The system uses a strict 95% certainty threshold to ensure safety-critical diagnostics are validated by experts when confidence is below the safety threshold.

**Core Value Proposition**: Reduce diagnostic time and improve maintenance accuracy through AI-driven analysis while maintaining strict safety standards through mandatory expert validation for uncertain diagnoses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**:
- React with TypeScript
- Vite as build tool and development server
- Wouter for client-side routing
- TanStack Query for server state management
- Shadcn/ui component library (New York variant) with Radix UI primitives
- Tailwind CSS for styling with custom Carbon Design System-inspired theme

**Design System**:
- IBM Plex Sans for typography (primary font family)
- IBM Plex Mono for technical data, part numbers, ATA codes
- Carbon Design System principles: clarity over decoration, mission-critical focus
- Custom color palette using HSL CSS variables supporting light/dark themes
- 12-column grid layout system with responsive breakpoints

**Key Frontend Patterns**:
- Component-based architecture with reusable UI primitives
- Form validation using React Hook Form with Zod resolvers
- Toast notifications for user feedback
- Sidebar navigation pattern with persistent left sidebar
- Progressive disclosure for complex diagnostic data

**State Management Strategy**:
- TanStack Query for API data fetching and caching
- Local component state for UI interactions
- No global state management library (keeps complexity low)

### Backend Architecture

**Technology Stack**:
- Node.js with Express
- TypeScript for type safety across full stack
- Drizzle ORM for database operations
- OpenAI API integration for diagnostic analysis
- Session-based authentication (connect-pg-simple for session storage)

**API Design**:
- RESTful endpoints under `/api` prefix
- JSON request/response format
- Shared schema validation between client and server using Zod
- Error handling with appropriate HTTP status codes

**Core Business Logic**:
The diagnostic engine (`server/diagnostic-engine.ts`) implements the AI analysis workflow:
1. Accepts structured diagnostic queries (aircraft model, serial number, ATA code, problem description, **task type**)
2. Passes query to the **3-Agent CrewAI system** (`crew_server.py` on port 9000)
3. Performs RAG-based analysis using 22,661 embedded documents
4. Calculates certainty score based on evidence strength
5. Returns comprehensive diagnostic response including:
   - Diagnosis summary
   - Certainty score and status (SAFE_TO_PROCEED vs REQUIRE_EXPERT)
   - Document references (IETP/AMP sections)
   - Recommended tests with expected results
   - Likely causes with probability rankings
   - Affected parts list
   - Historical similar cases
   - DMC tool selection for electrical work
   - **Mechanic log template** for Part ON/OFF tracking

**3-Agent CrewAI System** (`crew_server.py`):
- **Agent 1 - Primary Diagnostic**: Generates initial diagnosis with task-type-specific prompts
- **Agent 2 - Cross-Check Verification**: Validates diagnosis against manual references
- **Agent 3 - Historical + Inventory**: Adds historical context and inventory alerts

**Task Types Supported**:
- Fault Isolation, Functional Test, Operational Test
- Remove Procedure, Install Procedure
- Rigging Procedure, Adjust/Test Procedure

**Training Material Support**:
- PRIMUS_EPIC (Avionics System)
- PT6C_67CD (Engine Training)
- AW139_AIRFRAME (Structural Training)

**Safety-Critical Rule**: The system enforces a 95% certainty threshold. Diagnoses below this threshold trigger mandatory expert consultation recommendations.

**Automatic Aircraft Configuration Resolution**:
The system automatically determines aircraft configuration (SN/LN/ENH/PLUS) based on serial number:
- Serial number entered → System queries `serial_effectivity` table
- Configuration (Short Nose, Long Nose, Enhanced, PLUS) is resolved from IETP effectivity codes
- Real-time resolution: DiagnosticForm performs debounced API lookup (500ms) as mechanic types serial number
- Displayed as read-only badge on Dashboard with IETP effectivity code (mechanic cannot manually select)
- If serial not found, warning is displayed and part applicability filtering is disabled
- All diagnostic results, procedures, and parts are filtered by resolved configuration
- Configuration data is logged with each query for traceability (serial, config code, source document)

**IETP Applicability Codes (Table 2 - Authoritative Source)**:
- **1J = SN (Short Nose)**: S/N 31005-31200, 41001-41200
- **1L = LN (Long Nose)**: S/N 31201-31399, 41201-41299
- **A1 = ENH (Enhanced)**: S/N 31400-31699, 41300-41499, 60001-60999
- **A8 = PLUS**: S/N 31700 and subsequent, 41501 and subsequent, 61001-61999
- **All**: All four configurations (31005+, 41001+, 60001+, 61001+)

Note: S/N 41500 is not assigned to any configuration per the IETP (gap between ENH 41499 and PLUS 41501).

**Database Implementation of "and subsequent" ranges**:
The IETP uses four production series (31xxx, 41xxx, 60xxx, 61xxx). The "and subsequent" upper bounds in the database are capped at series boundaries to prevent overlap:
- PLUS 31xxx series: 31700-40999 (capped before 41xxx series)
- PLUS 41xxx series: 41501-59999 (capped before 60xxx series)
- ENH 60xxx series: 60001-60999 (bounded per IETP)
- PLUS 61xxx series: 61001-61999 (bounded per IETP)
If new production series are introduced, the serial_effectivity table must be updated.

**Database Tables for Effectivity**:
- `aircraft_configurations`: Master list of configuration codes (SN, LN, ENH, PLUS)
- `serial_effectivity`: Maps serial number ranges to configurations with IETP applicability codes (1J, 1L, A1, A8)
- `part_effectivity`: Maps part numbers to applicable configurations for IPD filtering

**Quota System**:
- FREE plan: Unlimited diagnostic requests
- Quota tracking by user for analytics

### Data Storage

**Database**: PostgreSQL (via Neon serverless)

**ORM**: Drizzle ORM with schema-first approach

**Schema Design** (`shared/schema.ts`):

1. **users table**:
   - Stores user credentials and plan information
   - Tracks daily request quota (dailyRequestCount, lastRequestDate)
   - Plan types: BASIC or ENTERPRISE

2. **diagnosticQueries table**:
   - Stores all diagnostic query submissions and results
   - Includes tenant_id for multitenancy preparation
   - Links to userId for quota enforcement
   - Stores AI response as JSONB for flexible data structure
   - Tracks certainty score and status for analytics

3. **experts table**:
   - Expert roster with specialties, availability status, and contact information
   - Includes tenant_id for multitenancy preparation (default: "omni-demo")
   - Fields: name, role, specialty, specialties (ATA codes), background, experience, whatsappNumber, available (1/0), deletedAt
   - **Soft Delete**: Experts are never permanently deleted; deletedAt timestamp is set instead
   - **Role Field**: Distinguishes expert titles/positions (default: "Specialist")
   - Used for expert booking recommendations when certainty < 95%
   - Admin CRUD via `/api/admin/experts` endpoints
   - All GET endpoints filter out soft-deleted records (WHERE deletedAt IS NULL)
   - Contact abstraction via `/api/experts/contact` (WhatsApp URL for chat and video calls)

4. **dmcTools table**:
   - Reference database for DMC wiring tools
   - Maps connector types to correct crimp tools, insertion/extraction tools
   - Includes safety warnings for critical procedures

5. **aircraftConfigurations table**:
   - Master list of AW139 configuration variants (SN, LN, ENH, PLUS)
   - Contains code, name, and description for each configuration

6. **serialEffectivity table**:
   - Maps serial number ranges to aircraft configurations
   - References IETP List of Effectivity Codes
   - Includes source document and revision for traceability

7. **partEffectivity table**:
   - Maps part numbers to applicable configurations
   - Enables configuration-aware part filtering from IPD

**Migration Strategy**: Drizzle Kit for schema migrations stored in `/migrations` directory

**Connection Management**: Connection pooling via @neondatabase/serverless with WebSocket support for serverless environments

### Authentication & Authorization

**Dual Authentication System**:
The application supports two authentication methods for different deployment scenarios:

1. **Replit Auth (Development/Demo)**: Uses OpenID Connect with Replit's identity provider
   - Automatic user creation on first login
   - Session managed via passport.js

2. **Email/Password Auth (VPS Production)**: Traditional credential-based authentication
   - Bcrypt password hashing with 10 salt rounds
   - Session-based auth stored in PostgreSQL (`sessions` table)
   - Admin user management at `/admin/users`

**Key Auth Routes** (`server/routes.ts`):
- `POST /api/auth/login`: Email/password login (sets session)
- `POST /api/auth/logout`: Destroys session and clears cookie
- `POST /api/auth/register`: Admin-only user creation
- `GET /api/auth/user`: Returns current user (supports both auth methods)

**User Roles**:
- `admin`: Full access including user management, expert management
- `user`: Standard access to diagnostic features

**Security Features**:
- Password never stored in plaintext (bcrypt)
- Admin-only routes verify role before access
- Inactive accounts blocked at login (`isActive` field)
- Session cookies marked httpOnly, secure in production

### AI Integration

**Provider**: OpenAI API

**Key Integration Points**:
1. Diagnostic query analysis in `server/diagnostic-engine.ts`
2. RAG (Retrieval-Augmented Generation) for document reference validation
3. Certainty scoring algorithm based on evidence strength
4. Historical case similarity matching

**Safety Constraints**:
- System prompt enforces strict rules against fabricating technical data
- All AMP/IETP references, part numbers, and specifications must be validated through RAG
- Certainty score calculation considers multiple factors: evidence quality, historical matches, ATA code alignment, documented procedures

## External Dependencies

### Third-Party APIs
- **OpenAI API**: Core AI diagnostic engine (requires `OPENAI_API_KEY` environment variable)

### Database Services
- **Neon Serverless PostgreSQL**: Primary data store (requires `DATABASE_URL` environment variable)

### UI Component Libraries
- **Shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Unstyled accessible components (accordion, dialog, dropdown, select, etc.)
- **Lucide React**: Icon library

### Development & Build Tools
- **Vite**: Frontend build tool and dev server with HMR
- **Replit Plugins**: Development tooling for Replit environment (cartographer, dev banner, runtime error overlay)
- **Drizzle Kit**: Database schema management and migrations
- **esbuild**: Production backend bundling

### Runtime Dependencies
- **TanStack Query**: Server state management
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation (shared between client/server)
- **date-fns**: Date manipulation utilities
- **class-variance-authority**: Component variant styling
- **clsx & tailwind-merge**: Utility class composition

### Font Resources
- **Google Fonts**: IBM Plex Sans and IBM Plex Mono (loaded via CDN in index.html)

### Asset Management
- Static assets stored in `attached_assets/` directory
- Expert headshot images referenced in components
- System prompt document for AI agent behavior