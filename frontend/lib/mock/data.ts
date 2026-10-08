import type {
  Conversation,
  ConversationSummary,
  GroupMember,
  Message,
  User,
} from "@/types";
import { generatedContacts } from "./generatedContacts";

export const CURRENT_USER_ID = "demo";

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

let messageSeq = 0;
function nextId(): string {
  messageSeq += 1;
  return `seed-m${messageSeq}`;
}

type SeedInput = Omit<Message, "id" | "clientId" | "reactions" | "status"> & {
  reactions?: Message["reactions"];
  status?: Message["status"];
};

function msg(input: SeedInput): Message {
  const id = nextId();
  return {
    id,
    clientId: id,
    reactions: [],
    status: "read",
    ...input,
  };
}

// --------------------------------------------------------------------------
// Users
// --------------------------------------------------------------------------

const namedUsers: User[] = [
  {
    id: "demo",
    name: "Demo User",
    username: "demo.01",
    phone: "+91 90000 00001",
    avatarUrl: null,
    about: "Available",
    isOnline: true,
    lastSeenAt: null,
  },
  {
    id: "aarav",
    name: "Aarav Mehta",
    username: "aarav.02",
    phone: "+91 90000 00002",
    avatarUrl: null,
    about: "At the gym 🏋️",
    isOnline: true,
    lastSeenAt: null,
  },
  {
    id: "priya",
    name: "Priya Sharma",
    username: "priya.03",
    phone: "+91 90000 00003",
    avatarUrl: null,
    about: "Busy",
    isOnline: false,
    lastSeenAt: ago(12 * MIN),
  },
  {
    id: "rohan",
    name: "Rohan Gupta",
    username: "rohan.04",
    phone: "+91 90000 00004",
    avatarUrl: null,
    about: "Hey there, I'm using Signal.",
    isOnline: false,
    lastSeenAt: ago(3 * HOUR),
  },
  {
    id: "ananya",
    name: "Ananya Iyer",
    username: "ananya.05",
    phone: "+91 90000 00005",
    avatarUrl: null,
    about: "",
    isOnline: false,
    lastSeenAt: ago(DAY),
  },
  {
    id: "kabir",
    name: "Kabir Singh",
    username: "kabir.06",
    phone: "+91 90000 00006",
    avatarUrl: null,
    about: "",
    isOnline: false,
    lastSeenAt: ago(2 * DAY),
  },
  {
    id: "meera",
    name: "Meera Nair",
    username: "meera.07",
    phone: "+91 90000 00007",
    avatarUrl: null,
    about: "",
    isOnline: false,
    lastSeenAt: ago(5 * DAY),
  },
  {
    id: "dev",
    name: "Dev Patel",
    username: "dev.08",
    phone: "+91 90000 00008",
    avatarUrl: null,
    about: "",
    isOnline: false,
    lastSeenAt: ago(6 * HOUR),
  },
];

// The 7 named people above carry hand-authored conversation history; these
// round out the directory to demo scale for contacts/search.
export const users: User[] = [...namedUsers, ...generatedContacts];

export function getUser(id: string | null | undefined): User | undefined {
  if (!id) return undefined;
  return users.find((u) => u.id === id);
}

// --------------------------------------------------------------------------
// DM: Aarav — recent, everything read
// --------------------------------------------------------------------------

export const dmAaravMessages: Message[] = [
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "Bro are we still on for the 6am run tomorrow?", createdAt: ago(3 * DAY) }),
  msg({ conversationId: "dm-aarav", senderId: "demo", type: "text", body: "Yeah locking it in, don't flake again 😂", createdAt: ago(3 * DAY - 4 * MIN) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "That was ONE time", createdAt: ago(3 * DAY - 6 * MIN) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "😤", createdAt: ago(3 * DAY - 6.5 * MIN) }),
  msg({ conversationId: "dm-aarav", senderId: "demo", type: "text", body: "Sure sure", createdAt: ago(2 * DAY) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "Check out this route I found, way better views than the usual loop", createdAt: ago(DAY + 3 * HOUR) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "maps.example.com/route/482", createdAt: ago(DAY + 2.9 * HOUR) }),
  msg({ conversationId: "dm-aarav", senderId: "demo", type: "text", body: "Nice, let's do that one Sunday", createdAt: ago(DAY + 2.5 * HOUR) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "👍", createdAt: ago(DAY + 2.4 * HOUR) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "Good run today", createdAt: ago(40 * MIN) }),
  msg({ conversationId: "dm-aarav", senderId: "demo", type: "text", body: "Felt good, legs are dead now though", createdAt: ago(38 * MIN) }),
  msg({ conversationId: "dm-aarav", senderId: "aarav", type: "text", body: "Same 💀", createdAt: ago(36 * MIN) }),
];

// --------------------------------------------------------------------------
// DM: Rohan — 5 unread, arrived while demo was away
// --------------------------------------------------------------------------

export const dmRohanMessages: Message[] = [
  msg({ conversationId: "dm-rohan", senderId: "demo", type: "text", body: "Did you get the placement portal invite?", createdAt: ago(2 * DAY) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "Yep, filled the form already", createdAt: ago(2 * DAY - 10 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "demo", type: "text", body: "Nice, what did you put for CTC expectation", createdAt: ago(2 * DAY - 15 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "left it blank lol, let's see", createdAt: ago(2 * DAY - 16 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "Hey are you up", createdAt: ago(32 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "Shortlist is out", createdAt: ago(31 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "WE'RE BOTH IN", createdAt: ago(30 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "check your email right now", createdAt: ago(29 * MIN) }),
  msg({ conversationId: "dm-rohan", senderId: "rohan", type: "text", body: "bro???", createdAt: ago(20 * MIN) }),
];

// --------------------------------------------------------------------------
// DM: Ananya — pinned
// --------------------------------------------------------------------------

export const dmAnanyaMessages: Message[] = [
  msg({ conversationId: "dm-ananya", senderId: "ananya", type: "text", body: "Sending you the notes from today's lecture", createdAt: ago(DAY) }),
  msg({ conversationId: "dm-ananya", senderId: "ananya", type: "text", body: "notes_ch7_scanned.pdf", createdAt: ago(DAY - 1 * MIN) }),
  msg({ conversationId: "dm-ananya", senderId: "demo", type: "text", body: "You're a lifesaver, thank you", createdAt: ago(DAY - 5 * MIN) }),
  msg({ conversationId: "dm-ananya", senderId: "ananya", type: "text", body: "np! let me know if the handwriting is unreadable in parts 😅", createdAt: ago(DAY - 6 * MIN) }),
  msg({ conversationId: "dm-ananya", senderId: "demo", type: "text", body: "it's fine, way better than my notes anyway", createdAt: ago(22 * HOUR) }),
  msg({ conversationId: "dm-ananya", senderId: "ananya", type: "text", body: "haha low bar", createdAt: ago(21.9 * HOUR) }),
  msg({ conversationId: "dm-ananya", senderId: "ananya", type: "text", body: "pinning this chat so I don't lose it in the list btw 📌", createdAt: ago(2 * HOUR) }),
];

// --------------------------------------------------------------------------
// DM: Kabir — muted, 2 unread
// --------------------------------------------------------------------------

export const dmKabirMessages: Message[] = [
  msg({ conversationId: "dm-kabir", senderId: "kabir", type: "text", body: "yo did you upload the assignment", createdAt: ago(4 * DAY) }),
  msg({ conversationId: "dm-kabir", senderId: "demo", type: "text", body: "yeah last night, cutting it close as usual", createdAt: ago(4 * DAY - 2 * MIN) }),
  msg({ conversationId: "dm-kabir", senderId: "kabir", type: "text", body: "respect", createdAt: ago(4 * DAY - 3 * MIN) }),
  msg({ conversationId: "dm-kabir", senderId: "kabir", type: "text", body: "new meme just dropped", createdAt: ago(5 * HOUR) }),
  msg({ conversationId: "dm-kabir", senderId: "kabir", type: "text", body: "meme_final_v3_FINAL.jpg", createdAt: ago(5 * HOUR - 1 * MIN) }),
];

// --------------------------------------------------------------------------
// DM: Priya — reply, reactions, one deleted message
// --------------------------------------------------------------------------

const priyaEarlier = msg({ conversationId: "dm-priya", senderId: "priya", type: "text", body: "Can you send the venue address for Saturday again?", createdAt: ago(6 * HOUR) });
const priyaDeleted = msg({
  conversationId: "dm-priya",
  senderId: "demo",
  type: "text",
  body: "",
  createdAt: ago(5.9 * HOUR),
  deletedAt: ago(5.8 * HOUR),
});

export const dmPriyaMessages: Message[] = [
  msg({ conversationId: "dm-priya", senderId: "priya", type: "text", body: "Weekend Trip group is getting chaotic lol", createdAt: ago(DAY + 2 * HOUR) }),
  msg({ conversationId: "dm-priya", senderId: "demo", type: "text", body: "someone needs to just make the call on dates", createdAt: ago(DAY + 1.9 * HOUR) }),
  msg({ conversationId: "dm-priya", senderId: "priya", type: "text", body: "on it, posting there now", createdAt: ago(DAY + 1.8 * HOUR) }),
  priyaEarlier,
  priyaDeleted,
  msg({
    conversationId: "dm-priya",
    senderId: "priya",
    type: "text",
    body: "it's the one near the lake, I'll drop a pin",
    createdAt: ago(5.5 * HOUR),
    replyToId: priyaEarlier.id,
  }),
  msg({
    conversationId: "dm-priya",
    senderId: "demo",
    type: "text",
    body: "perfect, see you all then 🙌",
    createdAt: ago(5.4 * HOUR),
    reactions: [
      { emoji: "❤️", userId: "priya" },
    ],
  }),
  msg({ conversationId: "dm-priya", senderId: "priya", type: "text", body: "😂😂😂", createdAt: ago(3 * HOUR) }),
];

// --------------------------------------------------------------------------
// Group: Weekend Trip — 5 members, Priya admin
// --------------------------------------------------------------------------

const weekendCreated = ago(6 * DAY);
export const groupWeekendMembers: GroupMember[] = [
  { userId: "priya", role: "admin", joinedAt: weekendCreated },
  { userId: "demo", role: "member", joinedAt: weekendCreated },
  { userId: "aarav", role: "member", joinedAt: ago(6 * DAY - 2 * MIN) },
  { userId: "ananya", role: "member", joinedAt: ago(6 * DAY - 3 * MIN) },
  { userId: "meera", role: "member", joinedAt: ago(5 * DAY) },
];

export const groupWeekendMessages: Message[] = [
  msg({ conversationId: "group-weekend", senderId: null, type: "system", body: "", createdAt: weekendCreated, systemEvent: { action: "created", actorId: "priya" } }),
  msg({ conversationId: "group-weekend", senderId: null, type: "system", body: "", createdAt: ago(6 * DAY - 2 * MIN), systemEvent: { action: "member_added", actorId: "priya", targetId: "aarav" } }),
  msg({ conversationId: "group-weekend", senderId: null, type: "system", body: "", createdAt: ago(6 * DAY - 3 * MIN), systemEvent: { action: "member_added", actorId: "priya", targetId: "ananya" } }),
  msg({ conversationId: "group-weekend", senderId: "priya", type: "text", body: "Okay team, where are we going this time", createdAt: ago(6 * DAY - 4 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "aarav", type: "text", body: "mountains > beach, fight me", createdAt: ago(6 * DAY - 3.5 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "ananya", type: "text", body: "beach honestly, I need to do nothing for 3 days", createdAt: ago(6 * DAY - 3 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: null, type: "system", body: "", createdAt: ago(5 * DAY), systemEvent: { action: "member_added", actorId: "priya", targetId: "meera" } }),
  msg({ conversationId: "group-weekend", senderId: "meera", type: "text", body: "added myself to the chaos, hi all", createdAt: ago(5 * DAY - 1 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "demo", type: "text", body: "lake house is still on the table btw", createdAt: ago(5 * DAY - 2 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "priya", type: "text", body: "ooh send the listing", createdAt: ago(5 * DAY - 3 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "demo", type: "text", body: "lakehouse-listing-482.example", createdAt: ago(5 * DAY - 4 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: null, type: "system", body: "", createdAt: ago(2 * DAY), systemEvent: { action: "name_changed", actorId: "priya", value: "Weekend Trip" } }),
  msg({ conversationId: "group-weekend", senderId: "aarav", type: "text", body: "renamed it from 'trip???' finally lmao", createdAt: ago(2 * DAY - 1 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "priya", type: "text", body: "booked the lake house! deposit's paid", createdAt: ago(10 * HOUR) }),
  msg({ conversationId: "group-weekend", senderId: "ananya", type: "text", body: "🎉🎉🎉", createdAt: ago(10 * HOUR - 1 * MIN) }),
  msg({ conversationId: "group-weekend", senderId: "meera", type: "text", body: "what's everyone bringing for food", createdAt: ago(1 * HOUR) }),
  msg({ conversationId: "group-weekend", senderId: "aarav", type: "text", body: "I'll handle the grill, someone else do drinks", createdAt: ago(55 * MIN) }),
];

// --------------------------------------------------------------------------
// Group: Placement Prep — Demo admin, Dev removed
// --------------------------------------------------------------------------

const placementCreated = ago(9 * DAY);
export const groupPlacementMembers: GroupMember[] = [
  { userId: "demo", role: "admin", joinedAt: placementCreated },
  { userId: "rohan", role: "member", joinedAt: placementCreated },
  { userId: "kabir", role: "member", joinedAt: ago(9 * DAY - 2 * MIN) },
  { userId: "dev", role: "member", joinedAt: ago(9 * DAY - 3 * MIN), leftAt: ago(DAY) },
];

export const groupPlacementMessages: Message[] = [
  msg({ conversationId: "group-placement", senderId: null, type: "system", body: "", createdAt: placementCreated, systemEvent: { action: "created", actorId: "demo" } }),
  msg({ conversationId: "group-placement", senderId: null, type: "system", body: "", createdAt: ago(9 * DAY - 2 * MIN), systemEvent: { action: "member_added", actorId: "demo", targetId: "kabir" } }),
  msg({ conversationId: "group-placement", senderId: null, type: "system", body: "", createdAt: ago(9 * DAY - 3 * MIN), systemEvent: { action: "member_added", actorId: "demo", targetId: "dev" } }),
  msg({ conversationId: "group-placement", senderId: "demo", type: "text", body: "Sharing the DSA sheet, let's finish it by Friday", createdAt: ago(9 * DAY - 4 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "rohan", type: "text", body: "on it", createdAt: ago(8 * DAY) }),
  msg({ conversationId: "group-placement", senderId: "kabir", type: "text", body: "which sheet exactly, there's like 5 floating around", createdAt: ago(8 * DAY - 2 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "demo", type: "text", body: "the one I pinned earlier, striver's", createdAt: ago(8 * DAY - 3 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "dev", type: "text", body: "can someone explain segment trees to me like I'm five", createdAt: ago(4 * DAY) }),
  msg({ conversationId: "group-placement", senderId: "rohan", type: "text", body: "lol same energy honestly", createdAt: ago(4 * DAY - 1 * MIN) }),
  msg({ conversationId: "group-placement", senderId: null, type: "system", body: "", createdAt: ago(DAY), systemEvent: { action: "member_removed", actorId: "demo", targetId: "dev" } }),
  msg({ conversationId: "group-placement", senderId: "kabir", type: "text", body: "wait what happened to dev", createdAt: ago(DAY - 1 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "demo", type: "text", body: "he switched to the other batch's group, all good", createdAt: ago(DAY - 2 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "rohan", type: "text", body: "mock interview slots are up, who's signing up", createdAt: ago(25 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "kabir", type: "text", body: "taking the 4pm one", createdAt: ago(24 * MIN) }),
  msg({ conversationId: "group-placement", senderId: "rohan", type: "text", body: "same, let's prep together before", createdAt: ago(23 * MIN) }),
];

// --------------------------------------------------------------------------
// Group: Family — disappearing messages (1 week)
// --------------------------------------------------------------------------

const familyCreated = ago(20 * DAY);
export const groupFamilyMembers: GroupMember[] = [
  { userId: "demo", role: "admin", joinedAt: familyCreated },
  { userId: "aarav", role: "member", joinedAt: familyCreated },
  { userId: "priya", role: "member", joinedAt: familyCreated },
];

export const groupFamilyMessages: Message[] = [
  msg({ conversationId: "group-family", senderId: null, type: "system", body: "", createdAt: familyCreated, systemEvent: { action: "created", actorId: "demo" } }),
  msg({ conversationId: "group-family", senderId: null, type: "system", body: "", createdAt: ago(20 * DAY - 1 * MIN), systemEvent: { action: "member_added", actorId: "demo", targetId: "priya" } }),
  msg({ conversationId: "group-family", senderId: "aarav", type: "text", body: "dinner Sunday at mom's as usual?", createdAt: ago(2 * DAY) }),
  msg({ conversationId: "group-family", senderId: "priya", type: "text", body: "yes! I'll bring dessert", createdAt: ago(2 * DAY - 2 * MIN) }),
  msg({ conversationId: "group-family", senderId: "demo", type: "text", body: "I'll get there a bit early to help set up", createdAt: ago(6 * HOUR) }),
  msg({ conversationId: "group-family", senderId: "aarav", type: "text", body: "👍", createdAt: ago(6 * HOUR - 1 * MIN) }),
];

// --------------------------------------------------------------------------
// Conversations
// --------------------------------------------------------------------------

function toSummary(message: Message): ConversationSummary {
  return {
    id: message.id,
    body: message.body,
    senderId: message.senderId,
    type: message.type,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt ?? null,
  };
}

function last(messages: Message[]): Message {
  return messages[messages.length - 1]!;
}

export const conversations: Conversation[] = [
  {
    id: "dm-aarav",
    type: "direct",
    name: null,
    memberIds: ["demo", "aarav"],
    lastMessage: toSummary(last(dmAaravMessages)),
    lastMessageAt: last(dmAaravMessages).createdAt,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: ago(10 * DAY),
  },
  {
    id: "dm-rohan",
    type: "direct",
    name: null,
    memberIds: ["demo", "rohan"],
    lastMessage: toSummary(last(dmRohanMessages)),
    lastMessageAt: last(dmRohanMessages).createdAt,
    unreadCount: 5,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: ago(12 * DAY),
  },
  {
    id: "dm-ananya",
    type: "direct",
    name: null,
    memberIds: ["demo", "ananya"],
    lastMessage: toSummary(last(dmAnanyaMessages)),
    lastMessageAt: last(dmAnanyaMessages).createdAt,
    unreadCount: 0,
    isPinned: true,
    isMuted: false,
    isArchived: false,
    createdAt: ago(15 * DAY),
  },
  {
    id: "dm-kabir",
    type: "direct",
    name: null,
    memberIds: ["demo", "kabir"],
    lastMessage: toSummary(last(dmKabirMessages)),
    lastMessageAt: last(dmKabirMessages).createdAt,
    unreadCount: 2,
    isPinned: false,
    isMuted: true,
    isArchived: false,
    createdAt: ago(8 * DAY),
  },
  {
    id: "dm-priya",
    type: "direct",
    name: null,
    memberIds: ["demo", "priya"],
    lastMessage: toSummary(last(dmPriyaMessages)),
    lastMessageAt: last(dmPriyaMessages).createdAt,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: ago(18 * DAY),
  },
  {
    id: "group-weekend",
    type: "group",
    name: "Weekend Trip",
    memberIds: groupWeekendMembers.filter((m) => !m.leftAt).map((m) => m.userId),
    members: groupWeekendMembers,
    createdBy: "priya",
    lastMessage: toSummary(last(groupWeekendMessages)),
    lastMessageAt: last(groupWeekendMessages).createdAt,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: weekendCreated,
  },
  {
    id: "group-placement",
    type: "group",
    name: "Placement Prep",
    memberIds: groupPlacementMembers.filter((m) => !m.leftAt).map((m) => m.userId),
    members: groupPlacementMembers,
    createdBy: "demo",
    lastMessage: toSummary(last(groupPlacementMessages)),
    lastMessageAt: last(groupPlacementMessages).createdAt,
    unreadCount: 3,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: placementCreated,
  },
  {
    id: "group-family",
    type: "group",
    name: "Family",
    memberIds: groupFamilyMembers.filter((m) => !m.leftAt).map((m) => m.userId),
    members: groupFamilyMembers,
    createdBy: "demo",
    disappearingSeconds: 604_800,
    lastMessage: toSummary(last(groupFamilyMessages)),
    lastMessageAt: last(groupFamilyMessages).createdAt,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isArchived: false,
    createdAt: familyCreated,
  },
];

export const seedMessages: Message[] = [
  ...dmAaravMessages,
  ...dmRohanMessages,
  ...dmAnanyaMessages,
  ...dmKabirMessages,
  ...dmPriyaMessages,
  ...groupWeekendMessages,
  ...groupPlacementMessages,
  ...groupFamilyMessages,
];
