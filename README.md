# Repo — AI Codebase Understanding IDE

**Repo** is a local-first, AI-powered **codebase-understanding IDE** — a VS Code / Cursor-style desktop app UI in the browser. Connect your GitHub account, pick a repository, hit **Analyze**, and explore your code with AI: chat about the codebase, browse files, view an architecture graph, run impact analysis, and search across the project.

> **Brand:** lime **`#B8F36B`** on near-black.
> **Live:** [repo-blue-eta.vercel.app](https://repo-blue-eta.vercel.app)

---

## Features

| Area | What you get |
| --- | --- |
| **GitHub OAuth login** | Real GitHub sign-in (OAuth 2.0 + PKCE S256), session persisted in `localStorage`, disconnect anytime |
| **Repository picker** | All your repos (public **and** private), search, `all / public / recent` filters, **5-per-page pagination** with Previous / Next, loading & error states with retry |
| **Repo switching** | Quick switcher (⌘-style modal) to change repositories without leaving the workspace |
| **Chat** | Chat UI over your codebase with source citations (`file:lines`) |
| **Code Explorer** | Browsable file tree with folders, symbols, and code view |
| **Architecture** | Repository architecture graph view |
| **Impact Analysis** | See what a change would affect across the codebase |
| **Search** | Fast full-repo search |
| **Command palette** | Keyboard-driven command launcher |
| **Settings & GitHub pages** | Connected-account view, repo list, logout |

**Not yet implemented** (planned): repository cloning, file indexing, embeddings, vector DB, local LLM (Ollama), and the RAG pipeline behind the chat. Chat/explorer views are currently UI-complete and operate on placeholder analysis data.

---

## Tech stack

- **React 19** + **TypeScript** (strict) — UI
- **Vite 8** — dev server & bundler
- **Tailwind CSS v4** (`@tailwindcss/vite`) — styling, CSS-variable design tokens
- **lucide-react** — icons
- **clsx / tailwind-merge / class-variance-authority** — class utilities
- **Oxlint** — linting
- **GitHub REST API** — authenticated user + repositories
- **Vercel** — hosting (static + serverless function for the OAuth token exchange)

---

## Getting started

### Prerequisites

- **Node.js 18+** (tested on Node 24) and npm
- A **GitHub App** (see below)

### 1. Create the GitHub App

1. Go to [GitHub → Settings → Developer settings → GitHub Apps → New GitHub App](https://github.com/settings/apps/new).
2. Set **Homepage URL** to `http://localhost:5173`.
3. Add **Authorization callback URL**:
   ```
   http://localhost:5173/auth/github/callback
   ```
   (Add your production URL later, e.g. `https://<your-app>.vercel.app/auth/github/callback`.)
4. Under **Webhook**, leave it disabled for now.
5. After creation, note the **Client ID** and generate a **Client secret** (*General → Client secrets*).

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```bash
VITE_GITHUB_CLIENT_ID=Iv23...        # public — bundled into the browser (safe)
GITHUB_CLIENT_SECRET=...             # SECRET — server-only, never prefixed with VITE_
```

> ⚠️ **Never** prefix the secret with `VITE_` — that would ship it to the browser.
> `.env` is gitignored; `.env.example` is committed as a template.

### 3. Install & run

```bash
npm install
npm run dev        # → http://localhost:5173
```

Click **Connect GitHub** → authorize → your repositories appear.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server (with OAuth token-exchange proxy) |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Preview the production build locally (proxy enabled) |
| `npm run lint` | Run Oxlint |

---

## How GitHub authentication works

The flow is **OAuth 2.0 Authorization Code + PKCE (S256)** with a minimal back-end-for-frontend (BFF) so the **client secret never reaches the browser**:

```
Browser                     Your server                     GitHub
  │  GET /login?client_id       │                              │
  │  + code_challenge ─────────►│                              │
  │                             │  authorize (user approves) ─►│
  │  ◄── 302 /auth/github/callback?code&state ────────────────│
  │  POST /api/github/token ───►│  code + secret + verifier ──►│
  │  ◄── { access_token } ◄────│  ◄── { access_token } ◄──────│
  │  GET /user, /user/repos ──────────────────────────────────►│
```

- **PKCE (`code_challenge` / `code_verifier`)** + random **`state`** (CSRF) — generated client-side, stored in `sessionStorage`, verified on callback.
- **Token exchange** is proxied server-side:
  - **Dev/preview:** middleware in [`vite.config.ts`](vite.config.ts) (`POST /api/github/token`), reads `GITHUB_CLIENT_SECRET` from `.env`.
  - **Production (Vercel):** serverless function [`api/github/token.ts`](api/github/token.ts), reads env vars from Vercel.
- **API calls** (`GET /user`, `GET /user/repos?per_page=100&page=N…`) go directly from the browser to `api.github.com` with the bearer token (CORS-enabled by GitHub).
- **Session** (token, user, repos, selected repo) persists in `localStorage` under `repo:session`. Reconnect only when the token expires or you disconnect.

---

## Project structure

```
.
├── api/
│   └── github/token.ts      # Vercel serverless: OAuth code → access token (holds secret)
├── src/
│   ├── components/          # Sidebar, TopBar, StatusBar, CommandPalette, RepositorySwitcher, …
│   ├── data/mockData.ts     # Shared TypeScript types (Repository, ChatMessage, FileNode, …)
│   ├── lib/
│   │   ├── github.ts        # OAuth + PKCE + GitHub API client + repo mapping
│   │   ├── session.ts       # localStorage session persistence
│   │   └── utils.ts         # cn() class helper
│   ├── pages/               # Welcome, Connecting, RepositorySelector, RepositoryAnalysis,
│   │                        # Chat, CodeExplorer, Architecture, ImpactAnalysis, SearchPage,
│   │                        # GitHub, Settings
│   ├── store/AppContext.tsx # Global state: auth flow, repos, selection, workspace view
│   ├── App.tsx              # Step machine: welcome → connecting → repositories → analyzing → workspace
│   └── index.css            # Design tokens (lime #B8F36B on near-black)
├── vite.config.ts           # Vite + dev/preview OAuth token-exchange proxy
├── vercel.json              # SPA rewrite (all routes → index.html)
└── .env.example             # Environment template
```

---

## App flow

```
welcome ──► connecting ──► repositories ──► analyzing ──► workspace
 (Connect     (OAuth +       (pick repo,      (analysis     (Chat · Explorer ·
  GitHub)      callback)      paginated)       progress)     Architecture · Impact · Search)
```

- `repositories` — search, filter, paginate (5/page), select, **Analyze Repository**
- `workspace` — IDE shell: TopBar + Sidebar + view + StatusBar; switch repos anytime

---

## Deploying to Vercel

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com) (framework: **Vite**; build: `npm run build`; output: `dist`).
2. **Project → Settings → Environment Variables** — add both, scoped to **Production + Preview + Development**:
   - `VITE_GITHUB_CLIENT_ID` (Config — needed at **build time** so it's inlined into the bundle)
   - `GITHUB_CLIENT_SECRET` (Secret — used by `api/github/token.ts` at runtime)
3. **Redeploy.**
4. In your GitHub App settings, add the callback URL:
   ```
   https://<your-deployment>.vercel.app/auth/github/callback
   ```

`vercel.json` rewrites everything except `/api/*` to `index.html`, so the OAuth deep-link callback works as an SPA route.

---

## Security notes

- The **client secret lives only server-side** (`.env` locally, Vercel env vars in production) — never in the frontend bundle.
- PKCE + `state` protect the authorization code exchange against interception/CSRF.
- The token-exchange endpoint validates `client_id` before forwarding to GitHub.
- `.env` is gitignored; rotate the secret if it ever leaks ([GitHub App settings](https://github.com/settings/apps)).

---

## Roadmap

- [x] Phase 2.1 — Real GitHub OAuth, session persistence, live repo listing (search / filter / pagination / disconnect)
- [ ] Repository cloning & file indexing (symbols, lines, languages)
- [ ] Embeddings + vector DB
- [ ] Local LLM integration (Ollama)
- [ ] RAG-backed chat with real source citations
- [ ] Desktop packaging (Tauri) for true local-first usage

---

## License

All rights reserved © 2026 [aamirali65](https://github.com/aamirali65).
