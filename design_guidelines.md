# AW139 Smart Troubleshooting Assistant - Design Guidelines

## Design Approach
**System-Based Design**: Carbon Design System (IBM) - optimized for data-heavy, mission-critical enterprise applications where clarity and reliability are paramount.

### Design Principles
1. **Clarity Over Decoration**: Information hierarchy drives every design decision
2. **Trust Through Professionalism**: Clean, consistent layouts build confidence in diagnostic accuracy
3. **Efficiency First**: Minimize cognitive load for mechanics working under time pressure
4. **Safety-Conscious Visual Language**: Critical information (certainty scores, safety warnings) uses unmistakable visual emphasis

## Typography System
- **Primary Font**: IBM Plex Sans (via Google Fonts)
- **Monospace**: IBM Plex Mono for technical data, part numbers, ATA codes
- **Hierarchy**:
  - Page Headers: text-3xl font-semibold
  - Section Headers: text-xl font-semibold
  - Subsections: text-lg font-medium
  - Body Text: text-base font-normal
  - Technical Data/Codes: text-sm font-mono
  - Small Labels: text-xs font-medium uppercase tracking-wide

## Layout System
**Spacing Units**: Tailwind's 4, 6, 8, 12, 16 system
- Component padding: p-6 or p-8
- Section spacing: space-y-8 or space-y-12
- Card gaps: gap-6
- Form field spacing: space-y-4

**Grid Structure**:
- Main dashboard: 12-column grid (grid-cols-12)
- Diagnostic cards: 2-column on desktop (lg:grid-cols-2)
- Tool selector: 3-column grid for tool options (lg:grid-cols-3)

## Component Library

### Navigation
- Persistent left sidebar (w-64) with application logo, main navigation, and subscription tier badge
- Top bar with aircraft selector, user profile, and notification bell icon
- Breadcrumb navigation for multi-step diagnostic flows

### Dashboard Layout
- Header section with aircraft details (model, serial, last maintenance) - full width banner with key metrics
- Primary diagnostic panel (2/3 width) showing diagnosis summary, certainty score visualization, and recommended tests
- Sidebar panel (1/3 width) with quick actions, recent queries, and expert availability

### Diagnostic Results Display
- **Certainty Score Indicator**: Large circular progress indicator (0-100 scale) with:
  - ≥95%: Prominent display with "Safe to Proceed" status
  - <95%: Clear visual distinction with "Expert Required" messaging
- **Structured Information Cards**:
  - Diagnosis Summary (expandable card with full technical details)
  - References Section (collapsible list of IETP/AMP documents with doc_id badges)
  - Recommended Tests (numbered list with expandable details)
  - Likely Causes (probability-ranked list with percentage indicators)
  - Affected Parts (table format with part numbers in monospace)

### DMC Tool Selector
- Connector type identification panel with image upload area
- Tool recommendation cards showing crimp/insert/extract tools
- Safety warnings in prominent alert boxes
- Technical specifications in data tables

### Expert Booking Interface
- Expert profile cards with photo placeholder, specialty tags, availability indicators
- Booking modal with calendar/time selection
- Option toggles for video call vs. chat consultation

### Forms & Input
- Structured input form with labeled fields for ATA code, problem description, aircraft details
- File upload area with drag-and-drop support for attachments
- Validation feedback displayed inline

### Data Tables
- Historical matches table with sortable columns (timestamp, similarity score, resolution)
- Parts/references tables with fixed-width columns for codes
- Zebra striping for readability

### Status & Alerts
- Certainty status banner (full-width, positioned above results)
- Quota usage indicator in navigation (progress bar showing remaining requests)
- Safety warnings as bordered alert boxes with icon

### Modals & Overlays
- Expert booking modal (centered, max-w-2xl)
- PDF export preview (full-screen overlay)
- Detailed reference viewer for IETP/AMP documents

## Images
**No large hero images required**. This is a professional diagnostic tool focused on functionality.

**Supporting Imagery**:
- Expert profile photos (circular thumbnails, 48x48px or 64x64px)
- Aircraft type icons/badges in header
- Connector/tool reference images in DMC selector (max-w-xs)
- Placeholder diagrams for wiring schematics (when applicable)

## Responsive Behavior
- Desktop-first design (primary use case: hangar workstations and tablets)
- Tablet (md): Sidebar collapses to hamburger menu, diagnostic panel stacks to single column
- Mobile: Simplified view focusing on core diagnostic flow, condensed data tables

## Animations
**Minimal and purposeful only**:
- Certainty score counter animation on initial load (count-up effect)
- Smooth expand/collapse transitions for accordion sections (transition-all duration-200)
- Loading states for RAG retrieval (subtle pulse on cards)
- No decorative animations - focus on data clarity