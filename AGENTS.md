# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript app for podcast shadow reading. Frontend code lives in `src/`: pages in `src/pages`, UI in `src/components`, API clients in `src/api`, hooks in `src/hooks`, contexts in `src/context`, and utilities in `src/utils`. Cloudflare Pages Functions live under `functions/api`, with backend helpers in `functions/lib`. Shared frontend/function code belongs in `shared`. Static deployment files are in `public`, database migrations in `migrations`, and planning notes in `docs`.

## Build, Test, and Development Commands

- `npm install` or `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server, usually at `http://localhost:5173`.
- `npm run typecheck`: run TypeScript checks for both `src` and Cloudflare Functions.
- `npm run build`: typecheck and produce the production `dist` bundle.
- `npm run preview`: serve the built Vite app locally.
- `npm run pages:dev`: build and run the app through `wrangler pages dev dist`.
- `npm run db:migrate:local`: apply D1 migrations to the local `shadowcast` database.
- `npm run db:migrate:remote`: apply D1 migrations to the remote `shadowcast` database.

## Coding Style & Naming Conventions

Use strict TypeScript and React function components. Keep components and pages in `PascalCase` files, hooks as `useSomething.ts`, and utility modules in lower camel case. Prefer typed API boundaries using `src/api/types.ts` or `shared/types.ts`. Follow the existing two-space indentation, single quotes in TypeScript, and Tailwind utility styling. Use tokens from `tailwind.config.js` for colors, fonts, shadows, and radii.

## Testing Guidelines

There is no dedicated test runner configured yet. For now, treat `npm run typecheck` and `npm run build` as required verification before submitting changes. When adding tests, colocate focused tests near the feature or add a clearly named test directory, and add the corresponding `npm test` script in `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short, direct messages, often in Chinese, such as `fix bug` or `用户模块`. Keep commits concise and scoped to one change. Pull requests should describe the user-facing change, list verification commands run, call out migrations or environment variable changes, and include screenshots for visible UI changes.

## Security & Configuration Tips

Do not commit `.env.local`, `.dev.vars`, secrets, or generated Wrangler state. Use `.env.example` as the public template. Keep PodcastIndex credentials and auth secrets server-side through the Vite proxy or Cloudflare Functions; never expose them in browser code.
