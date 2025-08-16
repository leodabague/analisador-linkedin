# GEMINI.md

## Project Overview

This project is a web application called "LinkedIn Network Insights" that analyzes and visualizes data from LinkedIn CSV exports. It is a single-page application (SPA) built with React and Vite, and it performs all data processing directly in the browser. The application allows users to upload a single CSV file or an entire folder of CSVs, and then it provides various analyses of the data, including top companies, functional areas, seniority levels, and connections.

The main technologies used are:

*   **React:** For building the user interface.
*   **Vite:** As the build tool and development server.
*   **Tailwind CSS:** For styling the application.
*   **PapaParse:** For parsing CSV files in the browser.
*   **Lucide React:** For icons.

The application's architecture is client-side only, with no backend. It uses React's `useState` and `useMemo` hooks for state management and to perform calculations for the various analyses.

## Building and Running

To build and run this project, you will need to have Node.js and npm installed.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the development server, and you can view the application at `http://localhost:5173`.

3.  **Build for production:**
    ```bash
    npm run build
    ```
    This will create a production-ready build of the application in the `dist` directory.

4.  **Lint the code:**
    ```bash
    npm run lint
    ```
    This will run ESLint to check for any linting errors in the code.

## Development Conventions

*   **Coding Style:** The project follows standard JavaScript and React coding conventions. It uses ESLint for linting, and the configuration can be found in the `eslint.config.js` file.
*   **Component Structure:** The main application logic is contained within the `src/App.jsx` file. This file includes all the components for the different analysis tabs.
*   **Company Name Normalization:** The application includes a utility for normalizing and clustering company names to handle variations in how they are represented in the data. The aliases for company names are defined in `src/utils/companyAliases.js`.
*   **Testing:** There are no explicit tests included in the project.
