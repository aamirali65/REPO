import type { Repository } from '../data/mockData';

const CLIENT_ID: string = import.meta.env.VITE_GITHUB_CLIENT_ID ?? '';

export const OAUTH_STATE_KEY = 'repo:oauth:state';
export const PKCE_VERIFIER_KEY = 'repo:oauth:verifier';

const AUTH_ENDPOINT = 'https://github.com/login/oauth/authorize';
const API_ENDPOINT = 'https://api.github.com';

export const DEPRECATED_REDIRECT_PATH = '/auth/github/callback';

// keep in sync with electron/ipc/oauth.ts (LOOPBACK_REDIRECT_URI)
const ELECTRON_REDIRECT_URI = 'http://localhost:5174/auth/github/callback';

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.repoNative;
}

export function getRedirectUri(): string {
  if (isElectron()) return ELECTRON_REDIRECT_URI;
  return `${window.location.origin}${DEPRECATED_REDIRECT_PATH}`;
}

export interface GitHubUser {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  htmlUrl: string;
}

interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: { login: string } | null;
  description: string | null;
  language: string | null;
  updated_at: string | null;
  html_url: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function generateCodeVerifier(): string {
  return randomBase64Url(32);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function getStoredVerifier(): string | null {
  return sessionStorage.getItem(PKCE_VERIFIER_KEY);
}

export function checkOAuthState(state: string | null): boolean {
  if (!state) return false;
  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  return !!stored && stored === state;
}

export function clearOAuthState(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

export async function buildAuthorizationUrl(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error('Missing VITE_GITHUB_CLIENT_ID. Add it to your .env file.');
  }
  const verifier = generateCodeVerifier();
  const state = randomBase64Url(16);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OAUTH_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

export async function exchangeCodeForToken(code: string, verifier: string): Promise<TokenResult> {
  if (!CLIENT_ID) {
    throw new Error('Missing VITE_GITHUB_CLIENT_ID. Add it to your .env file.');
  }

  const redirectUri = getRedirectUri();

  if (isElectron()) {
    return window.repoNative.exchangeToken({
      clientId: CLIENT_ID,
      code,
      codeVerifier: verifier,
      redirectUri,
    });
  }

  const res = await fetch('/api/github/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const detail = data.error_description || data.error;
    throw new Error(detail ? `GitHub auth failed: ${detail}` : `GitHub auth failed (${res.status})`);
  }
  if (!data.access_token) {
    throw new Error('GitHub auth failed: no access token returned');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? null,
  };
}

function headersWithAuth(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function fetchAuthenticatedUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${API_ENDPOINT}/user`, { headers: headersWithAuth(token) });
  if (!res.ok) {
    const detail = res.status === 401 ? 'session expired' : `HTTP ${res.status}`;
    throw new Error(`Failed to fetch GitHub user (${detail})`);
  }
  const data = await res.json();

  return {
    id: String(data.id),
    login: data.login,
    name: data.name ?? data.login,
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
  };
}

export async function fetchUserRepositories(token: string): Promise<GitHubApiRepo[]> {
  const all: GitHubApiRepo[] = [];
  let page = 1;

  for (;;) {
    const res = await fetch(
      `${API_ENDPOINT}/user/repos?per_page=100&page=${page}&sort=updated`,
      { headers: headersWithAuth(token) }
    );
    if (!res.ok) {
      const detail = res.status === 401 ? 'session expired' : `${res.status}`;
      throw new Error(`Failed to fetch repositories (${detail})`);
    }
    const batch = (await res.json()) as GitHubApiRepo[];
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return all;
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export function mapRepo(repo: GitHubApiRepo): Repository {
  return {
    id: String(repo.id),
    name: repo.name,
    owner: repo.owner?.login ?? '',
    fullName: repo.full_name,
    description: repo.description ?? '',
    language: repo.language ?? '',
    framework: '',
    visibility: repo.private ? 'private' : 'public',
    updatedAt: formatRelativeTime(repo.updated_at),
    files: 0,
    lines: 0,
    symbols: 0,
    languages: 0,
  };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}