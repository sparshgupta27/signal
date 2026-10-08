import { CURRENT_USER_ID, getUser } from "./data";

/**
 * The seeded `users` array is shared, synchronous, and read from both server
 * and client — mutating it directly on edit would desync SSR/CSR snapshots
 * (the same hazard ThemeProvider/useSession avoid). Instead, "my" editable
 * fields live as a small localStorage-backed override layered on top of the
 * seed values, read via useSyncExternalStore so every screen showing your
 * own name/about/avatar updates together.
 */

export interface MyProfile {
  name: string;
  about: string;
  avatarUrl: string | null;
}

const STORAGE_KEY = "signal-clone-profile";
const LOCAL_CHANGE_EVENT = "signal-clone-profile:local-change";

function seedProfile(): MyProfile {
  const me = getUser(CURRENT_USER_ID)!;
  return { name: me.name, about: me.about ?? "", avatarUrl: me.avatarUrl ?? null };
}

let cachedRaw: string | null = null;
let cachedProfile: MyProfile = seedProfile();

function readProfile(): MyProfile {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    if (raw) {
      try {
        cachedProfile = { ...seedProfile(), ...(JSON.parse(raw) as Partial<MyProfile>) };
      } catch {
        cachedProfile = seedProfile();
      }
    } else {
      cachedProfile = seedProfile();
    }
  }
  return cachedProfile;
}

export function getMyProfileSnapshot(): MyProfile {
  return readProfile();
}

export function getMyProfileServerSnapshot(): MyProfile {
  return seedProfile();
}

export function subscribeMyProfile(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_CHANGE_EVENT, onChange);
  };
}

export function updateMyProfile(patch: Partial<MyProfile>): void {
  const next = { ...readProfile(), ...patch };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}
