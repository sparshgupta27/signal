"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/auth/AuthShell";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { getCurrentUserId, markOnboarded, updateSessionUser } from "@/lib/session";
import * as api from "@/lib/api";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const isValid = firstName.trim().length > 0;

  const handleNext = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    const user = await api.updateMe({ name: fullName, avatarUrl });
    updateSessionUser(user);
    markOnboarded();
    router.push("/");
  };

  return (
    <AuthShell showBack>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[20px] font-semibold text-primary">Profile</h1>
        <p className="max-w-[300px] text-[13.5px] text-secondary">
          This will be visible to your contacts and groups.
        </p>
      </div>

      <AvatarPicker
        id={getCurrentUserId() ?? "me"}
        name={fullName || "?"}
        avatarUrl={avatarUrl}
        onChange={setAvatarUrl}
        size={96}
      />

      <div className="w-full space-y-3">
        <Input
          pill={false}
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoFocus
        />
        <Input
          pill={false}
          placeholder="Last name (optional)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
        />
      </div>

      <Button variant="primary" className="w-full" disabled={!isValid || saving} onClick={handleNext}>
        {saving ? "Saving…" : "Next"}
      </Button>
    </AuthShell>
  );
}
