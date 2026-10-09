import { CURRENT_USER_ID, users } from "./data";
import { updateMyProfile } from "./profile";

export interface Session {
  identifier: string;
  onboarded: boolean;
  loggedInAt: string;
}

const STORAGE_KEY = "signal-clone-session";
const LOCAL_CHANGE_EVENT = "signal-clone-session:local-change";

// Keyed by normalized identifier, holding whatever code was most recently
// "sent" for it. There's no real SMS gateway behind this mock, so the code
// is handed back to the caller to display directly, rather than only living
// server-side the way a real OTP would.
const pendingOtps = new Map<string, string>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(identifier: string): string {
  return identifier.trim().toLowerCase().replace(/\s+/g, "");
}

function findMatchingUser(identifier: string) {
  const normalized = normalize(identifier);
  return users.find(
    (u) =>
      normalize(u.username) === normalized ||
      normalize(u.phone) === normalized ||
      normalize(u.phone).endsWith(normalized)
  );
}

// --- storage plumbing (useSyncExternalStore-friendly: cached by raw string) ---

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

// --- mock auth flow ---

export async function requestOtp(identifier: string): Promise<{ isNewUser: boolean; otp: string }> {
  await delay();
  const otp = generateOtp();
  pendingOtps.set(normalize(identifier), otp);
  return { isNewUser: !findMatchingUser(identifier), otp };
}

export async function verifyOtp(
  identifier: string,
  code: string
): Promise<{ success: boolean; isNewUser: boolean }> {
  await delay();
  const expected = pendingOtps.get(normalize(identifier));
  if (!expected || code !== expected) return { success: false, isNewUser: false };
  // Burn it on success, same as a real one-time code — a stale "resend" tab
  // left open from earlier can't be replayed after this.
  pendingOtps.delete(normalize(identifier));

  const matched = findMatchingUser(identifier);
  const isNewUser = !matched;

  writeSession({
    identifier: identifier.trim(),
    // Existing seeded users (e.g. Demo User's own phone/username) skip
    // profile setup entirely; anyone else lands there next.
    onboarded: !isNewUser,
    loggedInAt: new Date().toISOString(),
  });

  return { success: true, isNewUser };
}

export async function completeProfile(input: { name: string; avatarUrl?: string | null }): Promise<void> {
  await delay(250);
  if (input.name.trim()) {
    updateMyProfile({
      name: input.name.trim(),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    });
  }

  const session = readSession();
  writeSession({
    identifier: session?.identifier ?? CURRENT_USER_ID,
    onboarded: true,
    loggedInAt: session?.loggedInAt ?? new Date().toISOString(),
  });
}

export function logout(): void {
  writeSession(null);
}
