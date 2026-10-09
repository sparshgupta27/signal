"use client";

import { usePathname } from "next/navigation";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const onSectionPage = pathname !== "/settings";

  if (isMobile) {
    // The list (section nav) and the detail (a section's content) are two
    // separate full-screen views on mobile, same drill-in pattern as the
    // chat list vs. an open thread — never both on screen at once.
    return onSectionPage ? (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-app">{children}</div>
    ) : (
      <SettingsNav fullWidth />
    );
  }

  return (
    <div className="flex min-w-0 flex-1">
      <SettingsNav />
      <div className="min-h-0 flex-1 overflow-y-auto bg-app">{children}</div>
    </div>
  );
}
