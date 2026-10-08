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

      <p className="max-w-[280px] text-center text-[12px] leading-[17px] text-secondary">
        By tapping Continue, you agree to our{" "}
        <span className="cursor-pointer text-accent hover:underline">Terms</span> &amp;{" "}
        <span className="cursor-pointer text-accent hover:underline">Privacy Policy</span>.
      </p>
    </AuthShell>
  );
}
