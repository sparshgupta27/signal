"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
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
import { CURRENT_USER_ID, getUser } from "@/lib/mock/data";
import { useMyProfile } from "@/hooks/useMyProfile";
import { updateMyProfile } from "@/lib/mock/profile";

const STATUS_SUGGESTIONS = ["Available", "Busy", "At work", "At the gym", "Sleeping", "In a meeting"];

export default function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = use(params);
  const me = getUser(CURRENT_USER_ID)!;
  const profile = useMyProfile();

  // Lazy-initialized from the live profile once: this is an edit draft that
  // only commits on Save, so it intentionally doesn't resync if the stored
  // profile changes elsewhere while the form is open.
  const [name, setName] = useState(() => profile.name);
  const [about, setAbout] = useState(() => profile.about);
  const [avatarUrl, setAvatarUrl] = useState(() => profile.avatarUrl);

  const handleSave = () => {
    const nextName = name.trim() || profile.name;
    updateMyProfile({ name: nextName, about: about.trim(), avatarUrl });
    setName(nextName);
    toast("Profile updated");
  };

  const [enterToSend, setEnterToSend] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);

  return (
    <div className="mx-auto w-full max-w-lg px-8 py-8">
      {section === "profile" && (
        <>
          <SettingsSectionTitle>Profile</SettingsSectionTitle>
          <div className="mb-6 flex flex-col items-center gap-3">
            <AvatarPicker id={me.id} name={name || me.name} avatarUrl={avatarUrl} onChange={setAvatarUrl} size={96} />
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
          <SettingsGroupLabel>Account</SettingsGroupLabel>
          <SettingsCard>
            <SettingsRow
              label="Username"
              control={
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`@${me.username}`);
                    toast("Username copied");
                  }}
                  className="flex items-center gap-1.5 text-[13px] text-secondary hover:text-primary"
                >
                  @{me.username}
                  <Copy size={13} />
                </button>
              }
            />
            <SettingsRow label="Phone" control={<span className="text-[13px] text-secondary">{me.phone}</span>} />
          </SettingsCard>
          <div className="mt-6 flex justify-end">
            <Button variant="primary" onClick={handleSave}>
              Save
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
                  onCheckedChange={setNotificationsEnabled}
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
              control={<Switch checked={showLastSeen} onCheckedChange={setShowLastSeen} label="Show last seen" />}
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
