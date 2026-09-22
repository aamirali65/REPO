import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import type { ServerResponse } from 'node:http'

const TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'

function githubTokenProxy(env: Record<string, string>): Plugin {
  if (!env.VITE_GITHUB_CLIENT_ID) {
    console.warn('[github-token-proxy] VITE_GITHUB_CLIENT_ID is not configured in .env')
  }
  if (!env.GITHUB_CLIENT_SECRET) {
    console.warn(
      '[github-token-proxy] GITHUB_CLIENT_SECRET is NOT set in .env — token exchange will fail. ' +
        'Generate it at https://github.com/settings/apps -> your app -> General -> Client secrets.'
    )
  } else {
    console.log(
      `[github-token-proxy] client_id=${env.VITE_GITHUB_CLIENT_ID} secret_loaded=true (length=${env.GITHUB_CLIENT_SECRET.length})`
    )
  }

  return {
    name: 'github-token-proxy',

    configureServer(server) {
      server.middlewares.use('/api/github/token', handle)
    },

    configurePreviewServer(server) {
      server.middlewares.use('/api/github/token', handle)
    },
  }

  async function handle(req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) {
    if (req.method !== 'POST') return next()

    const body = await readBody(req)
    if (!body) return sendJson(res, 400, { error: 'invalid_request', error_description: 'Invalid JSON body' })

    const { code, code_verifier, redirect_uri, client_id } = body

    if (!code || !code_verifier) {
      return sendJson(res, 400, { error: 'invalid_request', error_description: 'Missing code or code_verifier' })
    }
    if (!env.VITE_GITHUB_CLIENT_ID || client_id !== env.VITE_GITHUB_CLIENT_ID) {
      return sendJson(res, 400, { error: 'invalid_client', error_description: 'Unknown client_id' })
    }
    if (!env.GITHUB_CLIENT_SECRET) {
      return sendJson(res, 500, { error: 'server_error', error_description: 'GITHUB_CLIENT_SECRET is not configured' })
    }

    const params = new URLSearchParams({
      client_id: env.VITE_GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier,
    })
    if (redirect_uri) params.set('redirect_uri', redirect_uri)

    try {
      const upstream = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
      const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>
      if (!upstream.ok || data.error) {
        console.error(
          `[github-token-proxy] upstream status=${upstream.status} error=${data.error ?? 'none'} ` +
            `description=${data.error_description ?? 'none'} client_id=${env.VITE_GITHUB_CLIENT_ID} ` +
            `secretLength=${env.GITHUB_CLIENT_SECRET.length}`
        )
      }
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    } catch (err) {
      return sendJson(res, 502, { error: 'upstream_error', error_description: String(err) })
    }
  }
}

function readBody(req: Connect.IncomingMessage): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer | string) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

function sendJson(res: ServerResponse, status: number, data: Record<string, unknown>) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), githubTokenProxy(env)],
  }
})