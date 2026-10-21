# UBB Events frontend

## Prerequisites

- Node.js 22.12 or newer in the 22.x line, 24.x, or 26 or newer
- npm 10 or newer

## Setup

Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend API base URL. The `.env` file is local-only and must never be committed.

Install dependencies with `npm install`.

## Commands

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build.
- `npm run lint` checks the source with ESLint.
- `npm run typecheck` runs strict TypeScript checks.
- `npm run cypress:run` runs the Cypress end-to-end smoke tests. Start `npm run dev` first.

The frontend calls backend endpoints directly using `VITE_API_URL`; no development proxy or hard-coded API port is configured.
