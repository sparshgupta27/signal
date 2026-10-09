/**
 * Real OS-level push via the browser Notification API — the tab-title
 * unread count (useSocketBridge) is a separate, always-on mechanism; this
 * is what actually surfaces a message while the tab isn't being looked at
 * (hidden, or just unfocused behind another window).
 */

const PREF_KEY = "signal-clone-notifications-enabled";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Defaults to on — matches the Settings toggle's previous local-only default. */
export function getNotificationPref(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(PREF_KEY);
  return raw === null ? true : raw === "true";
}

export function setNotificationPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREF_KEY, String(enabled));
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

/** Only fires when the pref is on, permission is granted, and the user
 * genuinely isn't looking at the tab right now — never while it's focused,
 * even on a different conversation (the in-app toast already covers that). */
export function showMessageNotification(opts: {
  title: string;
  body: string;
  icon?: string;
  onClick: () => void;
}): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationPref()) return;
  if (document.hasFocus()) return;

  const notification = new Notification(opts.title, {
    body: opts.body,
    icon: opts.icon,
    tag: "signal-clone-message",
  });
  notification.onclick = () => {
    window.focus();
    opts.onClick();
    notification.close();
  };
}
