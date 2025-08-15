# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Start Development Server
```bash
npm run dev
```
Opens development server at http://localhost:5173 with hot module replacement.

### Build for Production
```bash
npm run build
```
Creates optimized production build in `dist/` directory.

### Lint Code
```bash
npm run lint
```
Runs ESLint with the project configuration.

### Preview Production Build
```bash
npm run preview
```
Serves the production build locally for testing.

### Install Dependencies
```bash
npm install
```
Install all project dependencies from package.json.

## Architecture Overview

This is a **LinkedIn Network Insights Analyzer** - a React-based single-page application for analyzing LinkedIn CSV exports.

### Core Architecture
- **Frontend-only SPA** with no backend dependencies
- **Client-side data processing** using browser APIs only
- **State management** via React's useState with derived computations using useMemo
- **CSV processing** handled by PapaParse library
- **File handling** supports both single file upload and folder selection (webkitdirectory)

### Key Data Flow
1. **Data Input**: CSV upload (single file or folder with subfolders)
2. **Data Deduplication**: Automatic removal of duplicate rows using canonical key comparison
3. **Data Analysis**: Real-time computation of insights (companies, roles, seniority, connections, locations)
4. **UI Presentation**: Tabbed interface with drill-down cards and paginated results
5. **Data Export**: CSV export capability for filtered/paginated results

### Major Components Structure
- `LinkedInInsightsAnalyzer` (main component in App.jsx) handles:
  - File upload and folder selection logic
  - All data processing and analysis computations
  - State management for UI interactions (selected companies, pagination, etc.)
  - Drill-down functionality with smooth scrolling
  - CSV export utilities

### Data Processing Logic
- **Company Extraction**: Regex patterns to extract company names from job titles
- **Role Categorization**: Pattern matching for functional areas (Technology, Sales, Marketing, etc.)
- **Seniority Detection**: Hierarchical pattern matching (C-Level → Intern)
- **Connection Analysis**: Mutual connections and networking metrics
- **Geographic Analysis**: Location frequency distribution

### Tech Stack Details
- **React 19** with functional components and hooks
- **Vite** for development server and build tooling
- **Tailwind CSS v3** for styling (deliberately using v3, not v4 for stability)
- **Lucide React** for icons
- **PapaParse** for CSV parsing/unparsing

### Expected CSV Format
The application expects LinkedIn export CSVs with these columns:
- `linkedin_url` - Profile URL
- `name` - Person's name  
- `degree_connection` - Connection degree (1st, 2nd, 3rd)
- `title` - Job title/position
- `location` - Geographic location
- `followers` - Follower count
- `mutual_connections` - Number of mutual connections

### UI Patterns
- **Tab-based navigation** with disabled states when no data loaded
- **Card-based drill-down** with smooth scrolling to expanded sections
- **Paginated results** (10 items per page) with Previous/Next navigation
- **Export buttons** for downloading filtered CSV results
- **Collapsible sections** with CSS transitions for smooth expand/collapse
- **Footer spacing** added to ensure pagination controls remain visible