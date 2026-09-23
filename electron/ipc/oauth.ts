import { app, ipcMain, shell, type BrowserWindow } from 'electron';
import http from 'node:http';

// keep in sync with src/lib/github.ts (ELECTRON_REDIRECT_URI)
const LOOPBACK_PORT = 5174;
const CALLBACK_PATH = '/auth/github/callback';
const LOOPBACK_REDIRECT_URI = `http://localhost:${LOOPBACK_PORT}${CALLBACK_PATH}`;
const AUTHORIZE_HOST = 'github.com';
const AUTHORIZE_PATH = '/login/oauth/authorize';
const DEV_TOKEN_ENDPOINT = 'http://localhost:5173/api/github/token';
const PROD_TOKEN_ENDPOINT = 'https://repo-blue-eta.vercel.app/api/github/token';

const CALLBACK_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>REPO — GitHub authorization</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#08090A;color:#eeeeee;display:flex;align-items:center;justify-content:center;min-height:100vh">
<main style="text-align:center;padding:24px">
<h1 style="font-size:18px;font-weight:600;margin:0 0 8px">Authorization complete</h1>
<p style="font-size:13px;color:#9a9fa7;margin:0">Return to REPO to finish connecting your GitHub account.</p>
</main>
</body>
</html>`;

let loopbackServer: http.Server | null = null;
let oauthWindow: BrowserWindow | null = null;

export function setOauthWindow(win: BrowserWindow): void {
  oauthWindow = win;
}

function requireString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function requireAuthorizeUrl(value: unknown): string {
  const raw = requireString(value, 'authorizeUrl', 4096);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid authorizeUrl');
  }
  if (url.protocol !== 'https:' || url.hostname !== AUTHORIZE_HOST || url.pathname !== AUTHORIZE_PATH) {
    throw new Error('Invalid authorizeUrl');
  }
  return url.toString();
}

function requireLoopbackRedirect(value: unknown): string {
  const raw = requireString(value, 'redirectUri', 2048);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid redirectUri');
  }
  if (url.toString() !== LOOPBACK_REDIRECT_URI) {
    throw new Error('Invalid redirectUri');
  }
  return LOOPBACK_REDIRECT_URI;
}

function stopLoopback(): void {
  if (loopbackServer) {
    loopbackServer.close();
    loopbackServer = null;
  }
}

function ensureLoopback(): Promise<void> {
  stopLoopback();
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname = '';
      let params: URLSearchParams | null = null;
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${LOOPBACK_PORT}`);
        pathname = url.pathname;
        params = url.searchParams;
      } catch {
        params = null;
      }

      if (req.method !== 'GET' || pathname !== CALLBACK_PATH || !params) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error') ?? params.get('error_description');

      console.log(
        `[repo-electron] oauth loopback callback hasCode=${!!code} hasState=${!!state} error=${error ?? 'none'}`
      );

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(CALLBACK_HTML);

      if (oauthWindow && !oauthWindow.isDestroyed()) {
        oauthWindow.webContents.send('oauth:callback', {
          code: code ?? undefined,
          state: state ?? undefined,
          error: error ?? undefined,
        });
        oauthWindow.focus();
      }
    });

    server.once('error', (err: NodeJS.ErrnoException) => {
      loopbackServer = null;
      const message =
        err.code === 'EADDRINUSE'
          ? `Local OAuth callback port ${LOOPBACK_PORT} is already in use.`
          : `Could not start local OAuth callback listener: ${err.message}`;
      reject(new Error(message));
    });

    server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
      loopbackServer = server;
      console.log(`[repo-electron] oauth loopback ready at ${LOOPBACK_REDIRECT_URI}`);
      resolve();
    });
  });
}

export function registerOauthIpc(): void {
  ipcMain.handle('oauth:begin', async (_event, input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const authorizeUrl = requireAuthorizeUrl(raw.authorizeUrl);

    await ensureLoopback();
    try {
      console.log(`[repo-electron] openExternal: ${authorizeUrl}`);
      await shell.openExternal(authorizeUrl);
    } catch (err) {
      stopLoopback();
      throw err;
    }
    return { ok: true };
  });

  ipcMain.handle('oauth:exchange', async (_event, input: unknown) => {
    const raw = (input ?? {}) as Record<string, unknown>;
    const clientId = requireString(raw.clientId, 'clientId', 256);
    const code = requireString(raw.code, 'code', 4096);
    const codeVerifier = requireString(raw.codeVerifier, 'codeVerifier', 4096);
    requireLoopbackRedirect(raw.redirectUri);

    const endpoint = app.isPackaged ? PROD_TOKEN_ENDPOINT : DEV_TOKEN_ENDPOINT;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: LOOPBACK_REDIRECT_URI,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || data.error) {
      const detail = data.error_description || data.error;
      throw new Error(
        detail ? `GitHub auth failed: ${String(detail)}` : `GitHub auth failed (${res.status})`
      );
    }
    if (typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('GitHub auth failed: no access token returned');
    }
    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
      expiresIn: typeof data.expires_in === 'number' ? data.expires_in : null,
    };
  });
}
