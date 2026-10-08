import { SettingsNav } from "@/components/settings/SettingsNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1">
      <SettingsNav />
      <div className="min-h-0 flex-1 overflow-y-auto bg-app">{children}</div>
    </div>
  );
}
