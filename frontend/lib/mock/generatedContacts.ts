import type { User } from "@/types";

/**
 * A large, deterministic pool of extra contacts so the contact list and
 * search have real scale to demonstrate, beyond the 7 named people with
 * hand-authored conversation histories in data.ts. Generation is index-based
 * (no Math.random) so the same 100 people, in the same order, exist on every
 * reload — stable avatar colours, stable search results.
 */

const FIRST_NAMES = [
  "Aarushi", "Advait", "Akash", "Alok", "Amara", "Amit", "Anjali", "Arush",
  "Avantika", "Bhavya", "Chetan", "Darshan", "Deepak", "Esha", "Gaurav",
  "Harini", "Jatin", "Kajal", "Lakshmi", "Manish", "Naina", "Omkar",
  "Pranav", "Rhea", "Sahil", "Tanya", "Uday", "Varun", "Yamini", "Zoya",
];

const LAST_NAMES = [
  "Agarwal", "Bhatt", "Chauhan", "Dutta",
];

const STATUSES = [
  "Available",
  "Busy",
  "At work",
  "Sleeping 😴",
  "In a meeting",
  "Living my best life",
  "Battery about to die 🔋",
  "At the gym 🏋️",
  "🎧 vibing",
  "Studying",
  "On a flight ✈️",
  "Working remotely",
  "Coffee first ☕",
  "Probably coding",
  "Out for a walk",
  "Watching cricket 🏏",
  "Weekend mode on",
  "Do not disturb",
  "Say less",
  "Hey there, I'm using Signal Clone",
];

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CONTACT_COUNT = 100;

export const generatedContacts: User[] = Array.from({ length: CONTACT_COUNT }, (_, i) => {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length]!;
  const lastName = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]!;
  const name = `${firstName} ${lastName}`;
  const seq = i + 9; // seed users already occupy .01–.08 / 00001–00008

  // Roughly 1 in 6 online right now; everyone else has a spread-out last-seen.
  const isOnline = i % 6 === 0;
  const lastSeenAt = isOnline ? null : ago((i % 5) * HOUR + (i % 13) * 7 * MIN + (i % 3) * DAY);

  return {
    id: `contact-${seq}`,
    name,
    username: `${slugify(firstName)}.${seq}`,
    phone: `+91 90000 ${String(seq).padStart(5, "0")}`,
    avatarUrl: null,
    about: STATUSES[i % STATUSES.length]!,
    isOnline,
    lastSeenAt,
  };
});

export const generatedContactIds: string[] = generatedContacts.map((u) => u.id);
