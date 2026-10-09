"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";
import * as api from "@/lib/api";
import { setSession } from "@/lib/session";

const DEMO_PHONE = "+91 90000 00001";

export default function WelcomePage() {
  const router = useRouter();
  const [tryingDemo, setTryingDemo] = useState(false);

  // Chains the same real request-otp/verify-otp calls the manual login flow
  // uses — no separate backend path, just skipping the two screens where an
  // evaluator would otherwise type a number and copy a code by hand.
  const handleTryDemo = async () => {
    if (tryingDemo) return;
    setTryingDemo(true);
    try {
      const { otp } = await api.requestOtp(DEMO_PHONE);
      const result = await api.verifyOtp(DEMO_PHONE, otp);
      if (!result.success || !result.accessToken || !result.user) {
        toast("Couldn't log in as the demo user");
        return;
      }
      setSession(result.accessToken, result.user, !result.needsProfile);
      router.push(result.needsProfile ? "/profile-setup" : "/");
    } catch {
      toast("Couldn't log in as the demo user");
    } finally {
      setTryingDemo(false);
    }
  };

  return (
    <AuthShell>
      <Logo size={72} />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[22px] font-semibold text-primary">Welcome to Signal Clone</h1>
        <p className="max-w-[320px] text-[14px] leading-[20px] text-secondary">
          Take privacy with you. Be yourself in every message.
        </p>
      </div>

      <Button variant="primary" className="w-full" onClick={() => router.push("/login")}>
        Continue
      </Button>

      <div className="w-full rounded-lg border border-divider bg-sidebar px-4 py-3 text-left">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
          Demo build — for evaluation
        </p>
        <p className="mb-2.5 text-[12.5px] leading-[18px] text-secondary">
          One click into <span className="font-medium text-primary">demo.01</span>&apos;s
          populated chat list, or open a second window as{" "}
          <span className="font-medium text-primary">aarav.02</span> for live messaging.
        </p>
        <Button variant="secondary" className="w-full" onClick={handleTryDemo} disabled={tryingDemo}>
          {tryingDemo ? "Logging in…" : "Try Demo"}
        </Button>
      </div>

      <p className="max-w-[280px] text-center text-[12px] leading-[17px] text-secondary">
        By tapping Continue, you agree to our{" "}
        <span className="cursor-pointer text-accent hover:underline">Terms</span> &amp;{" "}
        <span className="cursor-pointer text-accent hover:underline">Privacy Policy</span>.
      </p>
    </AuthShell>
  );
}
