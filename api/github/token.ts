import type { IncomingMessage, ServerResponse } from 'node:http'

const TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token'

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed', error_description: 'Use POST' })
    return
  }

  const clientId = process.env.VITE_GITHUB_CLIENT_ID ?? ''
  const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? ''

  if (!clientId || !clientSecret) {
    sendJson(res, 500, {
      error: 'server_error',
      error_description: 'GITHUB_CLIENT_SECRET / VITE_GITHUB_CLIENT_ID are not configured on this server',
    })
    return
  }

  const body = await readBody(req)
  if (!body) {
    sendJson(res, 400, { error: 'invalid_request', error_description: 'Invalid JSON body' })
    return
  }

  const { code, code_verifier, redirect_uri, client_id } = body

  if (!code || !code_verifier) {
    sendJson(res, 400, { error: 'invalid_request', error_description: 'Missing code or code_verifier' })
    return
  }
  if (client_id !== clientId) {
    sendJson(res, 400, { error: 'invalid_client', error_description: 'Unknown client_id' })
    return
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
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
    res.statusCode = upstream.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  } catch (err) {
    sendJson(res, 502, { error: 'upstream_error', error_description: String(err) })
  }
}

function readBody(req: IncomingMessage): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer | string) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw) as Record<string, string>)
      } catch {
        resolve(null)
      }
    })
    req.on('error', () => resolve(null))
  })
}

function sendJson(res: ServerResponse, status: number, data: Record<string, unknown>): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}