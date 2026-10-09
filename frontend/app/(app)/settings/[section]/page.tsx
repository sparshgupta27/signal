"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { ComingSoon } from "@/components/ui/ComingSoon";
import {
  SettingsCard,
  SettingsGroupLabel,
  SettingsRow,
  SettingsSectionTitle,
} from "@/components/settings/SettingsCard";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { SETTINGS_SECTIONS } from "@/components/settings/SettingsNav";
import { useMyProfile, useUpdateMyProfile } from "@/hooks/useMyProfile";
import { useSession } from "@/hooks/useSession";
import { ApiError } from "@/lib/api";
import {
  getNotificationPref,
  isNotificationSupported,
  requestNotificationPermission,
  setNotificationPref,
} from "@/lib/notifications";

const STATUS_SUGGESTIONS = ["Available", "Busy", "At work", "At the gym", "Sleeping", "In a meeting"];

export default function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = use(params);
  const session = useSession();
  const me = session?.user;
  const profile = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [saving, setSaving] = useState(false);

  // Lazy-initialized from the live profile once: this is an edit draft that
  // only commits on Save, so it intentionally doesn't resync if the stored
  // profile changes elsewhere while the form is open.
  const [name, setName] = useState(() => profile.name);
  const [about, setAbout] = useState(() => profile.about);
  const [avatarUrl, setAvatarUrl] = useState(() => profile.avatarUrl);
  const [username, setUsername] = useState(() => profile.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving) return;
    const nextName = name.trim() || profile.name;
    const nextUsername = username.trim();
    setSaving(true);
    setUsernameError(null);
    try {
      await updateProfile({
        name: nextName,
        about: about.trim(),
        avatarUrl,
        // Only sent when it actually changed — an unset username on a
        // phone-registered account is otherwise "" here, and re-sending
        // that every save would hit the same-value-is-still-valid path
        // for no reason.
        ...(nextUsername && nextUsername !== profile.username ? { username: nextUsername } : {}),
      });
      setName(nextName);
      setUsername(nextUsername);
      toast("Profile updated");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
        setUsernameError(e.message);
      } else {
        toast("Couldn't update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const [enterToSend, setEnterToSend] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getNotificationPref());
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);

  // Applies immediately, like show-last-seen below — this one genuinely
  // gates whether a real browser Notification fires (lib/notifications.ts),
  // so it's reality, not a draft field waiting on Save.
  const handleNotificationsChange = async (checked: boolean) => {
    if (!checked) {
      setNotificationPref(false);
      setNotificationsEnabled(false);
      return;
    }
    if (!isNotificationSupported()) {
      toast("Your browser doesn't support notifications");
      return;
    }
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      toast("Notifications blocked — enable them in your browser's site settings");
      setNotificationPref(false);
      setNotificationsEnabled(false);
      return;
    }
    setNotificationPref(true);
    setNotificationsEnabled(true);
  };

  // Unlike name/about/avatar, this applies immediately on toggle rather than
  // batching into the profile form's Save — it's a privacy setting, not a
  // draft, and the backend genuinely enforces it (last_seen_at is nulled
  // out for everyone else once this is off), so the switch should reflect
  // reality the moment it changes rather than only after a separate Save.
  const handleShowLastSeenChange = (checked: boolean) => {
    updateProfile({ showLastSeen: checked }).catch(() => {
      toast("Couldn't update that setting");
    });
  };

  const sectionLabel = SETTINGS_SECTIONS.find((s) => s.slug === section)?.label ?? "Settings";

  return (
    <div className="mx-auto w-full max-w-lg px-8 py-8">
      <Link
        href="/settings"
        className="mb-4 flex items-center gap-2 text-[13.5px] font-medium text-secondary md:hidden"
      >
        <ArrowLeft size={18} />
        {sectionLabel}
      </Link>
      {section === "profile" && (
        <>
          <SettingsSectionTitle>Profile</SettingsSectionTitle>
          <div className="mb-6 flex flex-col items-center gap-3">
            <AvatarPicker
              id={me?.id ?? "me"}
              name={name || me?.name || "?"}
              avatarUrl={avatarUrl}
              onChange={setAvatarUrl}
              size={96}
            />
          </div>
          <SettingsGroupLabel>Name &amp; about</SettingsGroupLabel>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} pill={false} placeholder="Display name" />
            <Input
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              pill={false}
              placeholder="About / status"
            />
            <div className="flex flex-wrap gap-1.5">
              {STATUS_SUGGESTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAbout(status)}
                  className="rounded-full bg-row-hover px-2.5 py-1 text-[12px] text-secondary hover:bg-row-selected hover:text-primary"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <SettingsGroupLabel>Username</SettingsGroupLabel>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s/g, ""));
                  setUsernameError(null);
                }}
                pill={false}
                placeholder="Choose a username"
                containerClassName="flex-1"
              />
              {profile.username && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`@${profile.username}`);
                    toast("Username copied");
                  }}
                  aria-label="Copy username"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-row-hover hover:text-primary"
                >
                  <Copy size={15} />
                </button>
              )}
            </div>
            <p className={`text-[12px] ${usernameError ? "text-danger" : "text-secondary"}`}>
              {usernameError ??
                "Lets people find you without your phone number — letters, numbers, dots, or underscores."}
            </p>
          </div>
          <SettingsGroupLabel>Account</SettingsGroupLabel>
          <SettingsCard>
            <SettingsRow label="Phone" control={<span className="text-[13px] text-secondary">{me?.phone}</span>} />
          </SettingsCard>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      )}

      {section === "appearance" && (
        <>
          <SettingsSectionTitle>Appearance</SettingsSectionTitle>
          <SettingsGroupLabel>Theme</SettingsGroupLabel>
          <ThemePicker />
        </>
      )}

      {section === "chats" && (
        <>
          <SettingsSectionTitle>Chats</SettingsSectionTitle>
          <SettingsCard>
            <SettingsRow
              label="Enter key sends"
              description="Turn off to send with Shift+Enter instead"
              control={<Switch checked={enterToSend} onCheckedChange={setEnterToSend} label="Enter key sends" />}
            />
            <SettingsRow label="Link previews" description="Coming soon" control={<Switch checked={false} onCheckedChange={() => {}} disabled label="Link previews" />} />
          </SettingsCard>
        </>
      )}

      {section === "notifications" && (
        <>
          <SettingsSectionTitle>Notifications</SettingsSectionTitle>
          <SettingsCard>
            <SettingsRow
              label="Enable notifications"
              control={
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={handleNotificationsChange}
                  label="Enable notifications"
                />
              }
            />
          </SettingsCard>
        </>
      )}

      {section === "privacy" && (
        <>
          <SettingsSectionTitle>Privacy</SettingsSectionTitle>
          <SettingsCard>
            <SettingsRow
              label="Read receipts"
              description="See and share when messages are read"
              control={<Switch checked={readReceipts} onCheckedChange={setReadReceipts} label="Read receipts" />}
            />
            <SettingsRow
              label="Typing indicators"
              control={
                <Switch
                  checked={typingIndicators}
                  onCheckedChange={setTypingIndicators}
                  label="Typing indicators"
                />
              }
            />
            <SettingsRow
              label="Show last seen"
              control={
                <Switch
                  checked={profile.showLastSeen}
                  onCheckedChange={handleShowLastSeenChange}
                  label="Show last seen"
                />
              }
            />
          </SettingsCard>
        </>
      )}

      {section === "linked-devices" && <ComingSoon title="No linked devices" />}

      {section === "help" && (
        <>
          <SettingsSectionTitle>Help</SettingsSectionTitle>
          <SettingsCard>
            <SettingsRow label="Version" control={<span className="text-[13px] text-secondary">1.0.0 (Signal Clone)</span>} />
          </SettingsCard>
        </>
      )}
    </div>
  );
}
