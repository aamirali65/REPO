import type { Repository } from '../data/mockData';

export interface AppUser {
  name: string;
  username: string;
  avatar: string;
  login: string;
  avatarUrl: string;
  htmlUrl: string;
}

export interface PersistedSession {
  token: string;
  user: AppUser;
  repos: Repository[];
  selectedRepoId: string | null;
}

const SESSION_KEY = 'repo:session';

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.token || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage may be unavailable; ignore so auth flow still works in-memory
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}