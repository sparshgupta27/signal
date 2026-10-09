import type { User } from "@/types";

/**
 * Drop-in replacement for lib/mock/data.ts's synchronous getUser(id) — same
 * call-site shape (a plain array .find), now backed by a cache primed from
 * the real API instead of a static seed array. At this app's scale (tens of
 * users) a full-directory cache is correct, not a shortcut; the one gap a
 * static seed never had is an id arriving that hasn't been fetched yet
 * (someone new DMs you, adds you to a group) — closed by fetchAndPrimeUser,
 * called on demand wherever that can happen (see useSocketBridge).
 */

const cache = new Map<string, User>();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  for (const l of listeners) l();
}

export function subscribeUsers(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getUsersVersion(): number {
  return version;
}

export function getUser(id: string | null | undefined): User | undefined {
  if (!id) return undefined;
  return cache.get(id);
}

export function primeUser(user: User): void {
  cache.set(user.id, user);
  notify();
}

export function primeUsers(users: User[]): void {
  for (const u of users) cache.set(u.id, u);
  notify();
}

export function clearUserCache(): void {
  cache.clear();
  notify();
}
