import { format, isThisWeek, isThisYear, isToday, isYesterday } from "date-fns";

/** Chat-list row timestamp: "4:12 PM" today, "Mon" this week, "Oct 3" this year, else full date. */
export function formatListTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEE");
  if (isThisYear(d)) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

/** Message bubble meta timestamp. */
export function formatBubbleTime(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

/** Thread date-divider label. */
export function formatDateDivider(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEEE");
  if (isThisYear(d)) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

/** Chat header subtitle for an offline user. */
export function formatLastSeenLabel(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "last seen recently";
  const d = new Date(lastSeenAt);
  if (isToday(d)) return `last seen today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, "h:mm a")}`;
  return `last seen ${format(d, "MMM d")} at ${format(d, "h:mm a")}`;
}

export function isSameCalendarDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;
}
