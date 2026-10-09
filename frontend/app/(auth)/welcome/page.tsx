"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { AuthShell } from "@/components/auth/AuthShell";

export default function WelcomePage() {
  const router = useRouter();

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
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          Demo build — for evaluation
        </p>
        <p className="mb-2 text-[12.5px] leading-[18px] text-secondary">
          Pre-loaded with sample accounts and conversations so there&apos;s no empty
          inbox to start from. SMS and encryption are mocked, as explicitly permitted
          by the brief — everything else (messaging, receipts, groups, attachments) is
          real.
        </p>
        <p className="text-[12.5px] leading-[18px] text-secondary">
          Log in as <span className="font-medium text-primary">demo.01</span> to see a
          populated chat list, or open a second window as{" "}
          <span className="font-medium text-primary">aarav.02</span> to try live
          two-way messaging between them. Full account list in the README.
        </p>
      </div>

      <p className="max-w-[280px] text-center text-[12px] leading-[17px] text-secondary">
        By tapping Continue, you agree to our{" "}
        <span className="cursor-pointer text-accent hover:underline">Terms</span> &amp;{" "}
        <span className="cursor-pointer text-accent hover:underline">Privacy Policy</span>.
      </p>
    </AuthShell>
  );
}
