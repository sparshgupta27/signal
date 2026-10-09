"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/auth/AuthShell";
import { COUNTRIES, flagEmoji, isValidNationalNumber, lengthHint } from "@/lib/countries";
import * as api from "@/lib/api";

const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.iso2 === "IN")!;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "username">("phone");
  const [iso2, setIso2] = useState(DEFAULT_COUNTRY.iso2);
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCountry = COUNTRIES.find((c) => c.iso2 === iso2) ?? DEFAULT_COUNTRY;
  const maxDigits = Math.max(...selectedCountry.lengths);
  const digits = phone.replace(/\D/g, "");
  const isValid =
    mode === "phone" ? isValidNationalNumber(selectedCountry, digits) : username.trim().length >= 3;

  // Caps input at the selected country's own max length (10 for India, 11
  // for Brazil, etc.) instead of letting someone type past what any valid
  // number there could be — isValidNationalNumber only disabled the button,
  // it never stopped you from typing more digits in the first place.
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, "").slice(0, maxDigits));
  };

  const handleCountryChange = (nextIso2: string) => {
    setIso2(nextIso2);
    const nextMax = Math.max(...(COUNTRIES.find((c) => c.iso2 === nextIso2)?.lengths ?? [maxDigits]));
    setPhone((prev) => prev.replace(/\D/g, "").slice(0, nextMax));
  };

  const handleContinue = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    const identifier = mode === "phone" ? `${selectedCountry.dial} ${phone.trim()}` : username.trim();
    try {
      const { otp } = await api.requestOtp(identifier);
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
          <>
            <div className="flex gap-2">
              <select
                value={iso2}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="h-9 w-32 shrink-0 truncate rounded-md bg-input px-2 text-[14px] text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {flagEmoji(c.iso2)} {c.name} ({c.dial})
                  </option>
                ))}
              </select>
              <Input
                pill={false}
                type="tel"
                inputMode="numeric"
                maxLength={maxDigits}
                placeholder="90000 00001"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                className="flex-1"
                autoFocus
              />
            </div>
            <p className="text-[12px] text-secondary">
              Enter {lengthHint(selectedCountry)} for {selectedCountry.name}.
            </p>
          </>
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
