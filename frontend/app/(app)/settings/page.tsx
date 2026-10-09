"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function SettingsIndexPage() {
  const isMobile = useIsMobile();
  const router = useRouter();

  // Desktop/tablet always show a section's content beside the nav, so bare
  // /settings needs a default. Mobile shows the section list itself here
  // (SettingsLayout renders SettingsNav for this exact path) — redirecting
  // there too would skip straight past it, same mistake the unconditional
  // redirect used to make before mobile layouts existed.
  useEffect(() => {
    if (!isMobile) router.replace("/settings/profile");
  }, [isMobile, router]);

  return null;
}
