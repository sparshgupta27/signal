"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/auth/AuthShell";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { CURRENT_USER_ID } from "@/lib/mock/data";
import * as auth from "@/lib/mock/auth";

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
    await auth.completeProfile({ name: fullName, avatarUrl });
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
        id={CURRENT_USER_ID}
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
