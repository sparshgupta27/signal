"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/ui/Logo";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpInput } from "@/components/auth/OtpInput";
import * as api from "@/lib/api";
import { setSession } from "@/lib/session";

const RESEND_SECONDS = 30;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  // Seeded from the query param login.tsx attached after requesting the
  // first code; refreshed locally (not re-read from the URL) on resend.
  const [otpHint, setOtpHint] = useState(searchParams.get("otp") ?? "");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (!identifier) router.replace("/login");
  }, [identifier, router]);

  const handleComplete = async (value: string) => {
    setVerifying(true);
    setError(false);
    const result = await api.verifyOtp(identifier, value);
    if (!result.success || !result.accessToken || !result.refreshToken || !result.user) {
      setError(true);
      setShakeKey((k) => k + 1);
      setCode("");
      setVerifying(false);
      return;
    }
    setSession(result.accessToken, result.refreshToken, result.user, !result.needsProfile);
    if (result.needsProfile) {
      router.push("/profile-setup");
    } else {
      router.push("/");
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    const { otp } = await api.requestOtp(identifier);
    setOtpHint(otp);
    setCountdown(RESEND_SECONDS);
    toast("Code resent");
  };

  return (
    <AuthShell showBack>
      <Logo size={56} />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-[20px] font-semibold text-primary">Enter the code</h1>
        <p className="max-w-[300px] text-[13.5px] text-secondary">
          We sent a code to <span className="font-medium text-primary">{identifier}</span>
        </p>
      </div>

      <OtpInput
        value={code}
        onChange={(v) => {
          setCode(v);
          setError(false);
        }}
        onComplete={handleComplete}
        shakeKey={shakeKey}
        error={error}
        disabled={verifying}
      />

      {error ? (
        <p className="text-[12.5px] text-danger">That code didn&apos;t match. Try again.</p>
      ) : (
        <p className="text-[12.5px] text-secondary">
          Demo code: <span className="font-medium text-primary">{otpHint}</span>
        </p>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={countdown > 0}
        className="text-[13px] font-medium text-accent disabled:text-secondary disabled:no-underline hover:underline"
      >
        {countdown > 0 ? `Resend code in 0:${countdown.toString().padStart(2, "0")}` : "Resend code"}
      </button>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
