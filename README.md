<div align="center">

<img src="public/favicon.svg" alt="REPO logo" width="110" />

# REPO

### Understand your codebase.

**AI-powered codebase intelligence for developers.**
Connect GitHub · explore code · ask questions · see what changes affect.

[![GitHub stars](https://img.shields.io/github/stars/aamirali65/REPO)](https://github.com/aamirali65/REPO/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/aamirali65/REPO)](https://github.com/aamirali65/REPO/network/members)
[![GitHub issues](https://img.shields.io/github/issues/aamirali65/REPO)](https://github.com/aamirali65/REPO/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/aamirali65/REPO)](https://github.com/aamirali65/REPO/commits/main)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel&logoColor=white)](https://repo-blue-eta.vercel.app)

**[Live Demo](https://repo-blue-eta.vercel.app)** · **[Report Issue](https://github.com/aamirali65/REPO/issues)** · **[Source](https://github.com/aamirali65/REPO)**

</div>

---

## What is REPO?

Modern repositories get hard to read as they grow. Locating where authentication is handled, tracing a login flow across screens and services, or judging what a change might break means jumping between files, following imports by hand, and rebuilding context from scratch — especially in a codebase you have never seen before.

**REPO** is a developer workspace for understanding codebases. Sign in with GitHub, pick a repository, and work inside a VS Code / Cursor-style environment built for comprehension: ask questions in natural language with answers that cite exact files and lines, browse code with a symbol-aware explorer, map architecture visually, and check the impact of a change before you make it.

Dark, fast, and keyboard-driven — lime `#B8F36B` on near-black.

---

## Features

### GitHub Integration

- **OAuth 2.0 with PKCE (S256)** sign-in — authorization code flow with CSRF `state` protection
- **Server-side token exchange** — the client secret never reaches the browser (see [Security](#security))
- **Live repository listing** from the GitHub API — public and private repos, automatically paginated
- **Search, filter (`all / public / recent`), and paginate** repositories before you pick one
- **Session persistence** — stay signed in across reloads; disconnect anytime from the GitHub panel

### Repository Selection & Analysis

- Rich repository cards: language, visibility, description, last-updated time
- **Guided analysis flow** that walks through connection, file discovery, language detection, symbol extraction, code-graph construction, and AI-context preparation — with live progress, stats, and per-file activity
- One click from selection to the full workspace

### Ask Repo — Codebase Chat

- Natural-language questions about the codebase (**"Where is authentication handled?"**, **"How does the login flow work?"**)
- Answers rendered with structured formatting: bold, inline code, numbered steps
- **Source citations** — every answer links the exact files and line ranges it is based on
- One-click **Open file** jumps straight from a citation into the Explorer
- Suggested-question chips to get started instantly

### Code Explorer

- Collapsible **file tree** with folder navigation
- Editor-style **tabs**, breadcrumbs, and line-numbered **syntax-highlighted** code view
- **Code intelligence panel** for the active symbol: type, reference count, callers, dependencies
- Quick actions: **Explain · References · Trace · Impact**
- Copy-to-clipboard for any file

### Search

- Query files, symbols, and descriptions from one input
- Filter by **All / Files / Symbols / Functions / Classes**
- Every result shows symbol, type, file, and line — click to open in the Explorer

### Architecture

- Interactive, **pan-and-zoom graph** of the project: screens, providers, services, models, APIs, storage
- Color-coded node types with dashed dependency edges
- Click a node for its type, description, and connections — navigate the graph from the details panel

### Impact Analysis

- Pick a symbol to see its blast radius before you change it
- **Impact level badge**: low / medium / high
- Visual **impact chain** plus **direct references** and **potentially affected** files with line numbers

### Developer Tooling

- **⌘K / Ctrl+K command palette** — jump to any view, switch repositories, fully keyboard-navigable
- **Repository switcher** — search and swap repos without leaving the workspace
- Collapsible sidebar, top bar with branch/index status, status bar
- Settings: appearance, editor font, AI provider/model preferences, privacy status, connected GitHub account

---

## How it works

```
   GitHub account
         │
         │  1.  Connect — OAuth 2.0 + PKCE (S256), state CSRF check
         ▼
   ┌───────────┐   POST /api/github/token    ┌──────────────────────┐
   │   REPO    │ ──────────────────────────► │   BFF (server-side)  │
   │ (browser) │   { code, code_verifier }   │  adds client_secret  │
   └─────┬─────┘ ◄────────────────────────── └───────────┬──────────┘
         │            { access_token }                   │
         │                                               │  2. code → token
         │                                               ▼
         │                                    GitHub OAuth endpoint
         │
         │  3.  GET /user · GET /user/repos (paginated)
         ▼
   Repository selection  ──►  Guided analysis  ──►  Workspace
                                                        │
              ┌───────────┬───────────┬────────┬────────┴───────┐
              ▼           ▼           ▼        ▼                ▼
          Ask Repo     Explorer     Search  Architecture    Impact
           (chat)     (code view)          (graph)         (blast radius)
```

1. **Connect** — the browser starts the OAuth dance with a PKCE challenge; GitHub redirects back to `/auth/github/callback`.
2. **Exchange** — the browser posts the authorization `code` to REPO's BFF, which validates the `client_id`, attaches the secret, and returns an access token.
3. **Fetch** — REPO loads your profile and repositories straight from the GitHub REST API with the bearer token.
4. **Analyze & explore** — pick a repository, run the guided analysis, and open the workspace.

---

## Architecture

```
┌──────────────────────── Browser — React SPA ─────────────────────────┐
│  App state (AppContext)     Session: localStorage                    │
│  Welcome → OAuth → Selector → Analysis → Workspace                   │
│  Views: Chat · Explorer · Search · Architecture · Impact · GitHub    │
│  GitHub API calls: direct with Bearer token                          │
└───────────────┬───────────────────────────────────────────────────────┘
                │  POST /api/github/token
                ▼
┌──────────────────── Server-side BFF ─────────────────────┐
│  Dev / preview : Vite middleware  (vite.config.ts)       │
│  Production    : Vercel Function  (api/github/token.ts)  │
│  Validates client_id · attaches client_secret · forwards │
└───────────────┬──────────────────────────────────────────┘
                ▼
        GitHub OAuth + REST API
```

| Directory | Role |
| --- | --- |
| `src/pages/` | Full-screen flow and workspace views (Welcome, Selector, Analysis, Chat, Explorer, …) |
| `src/components/` | Shell UI — Sidebar, TopBar, StatusBar, CommandPalette, RepositorySwitcher, logo |
| `src/store/AppContext.tsx` | Global state machine: auth flow, repositories, analysis, workspace navigation |
| `src/lib/github.ts` | OAuth + PKCE helpers, token exchange client, GitHub REST client |
| `src/lib/session.ts` | localStorage session persistence |
| `src/data/mockData.ts` | Shared domain types and workspace datasets |
| `api/github/token.ts` | Vercel serverless function — OAuth code → access token |
| `vite.config.ts` | Build config + dev/preview token-exchange middleware |

---

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19 · TypeScript 6 · Vite 8 |
| Styling | Tailwind CSS 4 · design tokens (`#B8F36B` on `#08090A`) · Inter & JetBrains Mono |
| Icons | lucide-react |
| Authentication | GitHub OAuth 2.0 · PKCE S256 · OAuth `state` (CSRF) |
| Server | Vite middleware (dev) · Vercel Functions (production) |
| APIs | GitHub REST API (`/user`, `/user/repos`) |
| Tooling | Oxlint · `tsc` strict type-checking |
| Hosting | Vercel |

---

## Project structure

```
REPO/
├── api/
│   └── github/
│       └── token.ts            # Vercel serverless: OAuth code → access token
├── public/
│   ├── favicon.svg             # REPO logo
│   └── icons.svg
├── src/
│   ├── assets/                 # Static assets
│   ├── components/             # Sidebar, TopBar, StatusBar, CommandPalette,
│   │                           # RepositorySwitcher, RepoLogo, GithubIcon
│   ├── data/
│   │   └── mockData.ts         # Domain types + workspace datasets
│   ├── lib/
│   │   ├── github.ts           # OAuth + PKCE + GitHub API client
│   │   ├── session.ts          # Session persistence (localStorage)
│   │   └── utils.ts            # Class-name utilities
│   ├── pages/                  # Welcome, Connecting, RepositorySelector,
│   │                           # RepositoryAnalysis, Chat, CodeExplorer,
│   │                           # Architecture, ImpactAnalysis, SearchPage,
│   │                           # GitHub, Settings
│   ├── store/
│   │   └── AppContext.tsx      # Global state + auth/analysis flow
│   ├── App.tsx                 # Route/step shell
│   ├── index.css               # Theme tokens & animations
│   └── main.tsx
├── .env.example                # Environment template
├── index.html
├── package.json
├── vercel.json                 # SPA rewrites for Vercel
└── vite.config.ts              # Vite + OAuth token-exchange middleware
```

---

## Getting started

### Prerequisites

- **Node.js 18+** and npm
- A **GitHub App** (free) — takes about a minute to create

### 1. Clone the repository

```bash
git clone https://github.com/aamirali65/REPO.git
cd REPO
```

### 2. Create a GitHub App

1. Go to **[GitHub Settings → Developer settings → GitHub Apps → New GitHub App](https://github.com/settings/apps/new)**.
2. Set **Homepage URL** to `http://localhost:5173`.
3. Set the **Authorization callback URL** to:
   ```
   http://localhost:5173/auth/github/callback
   ```
4. Disable the webhook (REPO does not need one).
5. Create the app, then note the **Client ID** and generate a **Client secret** under *General → Client secrets*.

> Deploying to production? Also register your deployment URL:
> `https://<your-domain>/auth/github/callback`

### 3. Configure environment variables

```bash
cp .env.example .env
```

```bash
VITE_GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
```

### 4. Install and run

```bash
npm install
npm run dev
```

Open **http://localhost:5173**, click **Connect GitHub**, authorize the app, and you are in.

---

## Environment variables

| Variable | Description | Required |
| --- | --- | --- |
| `VITE_GITHUB_CLIENT_ID` | GitHub App Client ID. Public — bundled into the browser. | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub App client secret. **Server-only** — read by the BFF, never shipped to the browser. | Yes |

> Never prefix the secret with `VITE_` — Vite inlines any `VITE_*` variable into the client bundle. `.env` is gitignored; commit only `.env.example`.

---

## Development

All available scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with the token-exchange middleware |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Serve the production build locally (middleware enabled) |
| `npm run lint` | Run Oxlint |

---

## Deployment

REPO is deployed on **Vercel** → **[repo-blue-eta.vercel.app](https://repo-blue-eta.vercel.app)**

1. Import the repository into [Vercel](https://vercel.com/new) (Vite framework preset — build `npm run build`, output `dist`).
2. Add environment variables for **Production, Preview, and Development**:
   - `VITE_GITHUB_CLIENT_ID` (available at build time)
   - `GITHUB_CLIENT_SECRET` (used at runtime by `api/github/token.ts`)
3. Add the production callback URL to your GitHub App:
   ```
   https://<your-deployment>.vercel.app/auth/github/callback
   ```
4. Deploy.

`vercel.json` rewrites all non-`/api/*` routes to `index.html`, so the OAuth callback deep link resolves correctly as an SPA route while the serverless token endpoint stays reachable.

---

## Security

- **Client secret stays server-side.** The browser only ever sends `{ client_id, code, code_verifier }` to `/api/github/token`; the BFF attaches the secret before calling GitHub. The secret is read from the environment, never from client code.
- **PKCE (S256)** binds the authorization code to the session that started it — a stolen code is useless without the verifier.
- **OAuth `state`** parameter is generated client-side, verified on callback, and cleared after use (CSRF protection).
- **`client_id` validation** — the BFF rejects requests with an unknown `client_id` before contacting GitHub.
- **Scoped GitHub access** — API calls use your bearer token against `api.github.com` only; access is limited to what you authorize in the GitHub consent screen, and you can revoke it anytime via **Disconnect** or [GitHub application settings](https://github.com/settings/installations).
- **Secret hygiene** — `.env` is gitignored, `.env.example` contains placeholders only, and the secret is stored as a protected Vercel environment variable in production.

---

## Contributing

Contributions are welcome:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/<you>/REPO.git`
3. **Create a branch**: `git checkout -b feature/your-change`
4. **Install**: `npm install`
5. **Make your changes**
6. **Verify**: `npm run build` and `npm run lint` must pass
7. **Commit** with a clear message and **push** to your fork
8. **Open a pull request** against `main`

---

## License

No license has been specified for this repository. All rights reserved by the author.

---

## Author

**Aamir Almani** — [@aamirali65](https://github.com/aamirali65)

---

## Links

- **Live demo:** https://repo-blue-eta.vercel.app
- **Repository:** https://github.com/aamirali65/REPO
- **Issues:** https://github.com/aamirali65/REPO/issues
