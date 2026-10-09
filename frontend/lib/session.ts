import type { User } from "@/types";

/**
 * The real session: a JWT from the backend plus the logged-in user's own
 * profile. Same useSyncExternalStore-friendly localStorage pattern
 * lib/mock/auth.ts used (cached by raw string so repeated reads without an
 * underlying change are cheap) — only the shape being persisted changed.
 */
export interface Session {
  accessToken: string;
  user: User;
  /** False between a brand-new signup's verify-otp and their completing profile-setup. */
  onboarded: boolean;
}

const STORAGE_KEY = "signal-clone-session";
const LOCAL_CHANGE_EVENT = "signal-clone-session:local-change";

let cachedRaw: string | null = null;
let cachedSession: Session | null = null;

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSession = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cachedSession = null;
    }
  }
  return cachedSession;
}

function writeSession(session: Session | null) {
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

export function subscribeSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_CHANGE_EVENT, onChange);
  };
}

export function getSessionSnapshot(): Session | null {
  return readSession();
}

export function getServerSessionSnapshot(): Session | null {
  return null;
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null;
}

/** Drop-in replacement for the old CURRENT_USER_ID constant — same
 * synchronous call-site shape, now backed by the real logged-in user. */
export function getCurrentUserId(): string | null {
  return readSession()?.user.id ?? null;
}

export function getCurrentUser(): User | null {
  return readSession()?.user ?? null;
}

export function setSession(accessToken: string, user: User, onboarded: boolean): void {
  writeSession({ accessToken, user, onboarded });
}

/** Called after PATCH /users/me so every screen reading the session sees the edit. */
export function updateSessionUser(user: User): void {
  const current = readSession();
  if (!current) return;
  writeSession({ ...current, user });
}

export function markOnboarded(): void {
  const current = readSession();
  if (!current) return;
  writeSession({ ...current, onboarded: true });
}

export function clearSession(): void {
  writeSession(null);
}
