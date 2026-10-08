export function SettingsCard({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-divider rounded-lg bg-sidebar">{children}</div>;
}

export function SettingsRow({
  label,
  description,
  control,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-primary">{label}</div>
        {description && <div className="text-[12px] text-secondary">{description}</div>}
      </div>
      {control}
    </div>
  );
}

export function SettingsSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-[20px] font-semibold text-primary">{children}</h2>;
}

export function SettingsGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-secondary first:mt-0">
      {children}
    </h3>
  );
}
