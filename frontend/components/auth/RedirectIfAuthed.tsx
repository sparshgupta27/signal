"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

/** Bounces an already-logged-in visitor away from the onboarding screens. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const authorized = !!session?.onboarded;

  useEffect(() => {
    if (authorized) router.replace("/");
  }, [authorized, router]);

  if (authorized) return null;
  return <>{children}</>;
}
