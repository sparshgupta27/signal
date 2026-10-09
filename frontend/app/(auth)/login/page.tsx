"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/auth/AuthShell";
import * as auth from "@/lib/mock/auth";

const COUNTRY_CODES = [
  { dial: "+91", flag: "🇮🇳", label: "India" },
  { dial: "+1", flag: "🇺🇸", label: "United States" },
  { dial: "+44", flag: "🇬🇧", label: "United Kingdom" },
  { dial: "+61", flag: "🇦🇺", label: "Australia" },
  { dial: "+971", flag: "🇦🇪", label: "UAE" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "username">("phone");
  const [dial, setDial] = useState(COUNTRY_CODES[0]!.dial);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = mode === "phone" ? phone.replace(/\D/g, "").length >= 7 : username.trim().length >= 3;

  const handleContinue = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    const identifier = mode === "phone" ? `${dial} ${phone.trim()}` : username.trim();
    try {
      const { otp } = await auth.requestOtp(identifier);
      router.push(`/verify?identifier=${encodeURIComponent(identifier)}&otp=${otp}`);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell showBack>
      <Logo size={56} />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-[20px] font-semibold text-primary">Your phone number</h1>
        <p className="max-w-[300px] text-[13.5px] text-secondary">
          Signal Clone will send an SMS to verify your number. Carrier rates may apply.
        </p>
      </div>

      <div className="w-full space-y-3">
        {mode === "phone" ? (
          <div className="flex gap-2">
            <select
              value={dial}
              onChange={(e) => setDial(e.target.value)}
              className="h-9 shrink-0 rounded-md bg-input px-2 text-[14px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.dial} value={c.dial}>
                  {c.flag} {c.dial}
                </option>
              ))}
            </select>
            <Input
              pill={false}
              type="tel"
              inputMode="numeric"
              placeholder="90000 00001"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              className="flex-1"
              autoFocus
            />
          </div>
        ) : (
          <Input
            pill={false}
            placeholder="username.01"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            autoFocus
          />
        )}

        <button
          type="button"
          onClick={() => setMode((m) => (m === "phone" ? "username" : "phone"))}
          className="text-[13px] font-medium text-accent hover:underline"
        >
          {mode === "phone" ? "Use a username instead" : "Use a phone number instead"}
        </button>

        {error && <p className="text-[12.5px] text-danger">{error}</p>}
      </div>

      <Button variant="primary" className="w-full" disabled={!isValid || submitting} onClick={handleContinue}>
        {submitting ? "Please wait…" : "Next"}
      </Button>

      <p className="max-w-[300px] text-center text-[12px] text-secondary">
        Tip: try demo.01 or +91 90000 00001 to sign in as the seeded Demo User.
      </p>
    </AuthShell>
  );
}
