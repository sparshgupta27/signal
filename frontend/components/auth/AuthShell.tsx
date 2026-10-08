"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface AuthShellProps {
  children: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export function AuthShell({ children, onBack, showBack = false }: AuthShellProps) {
  const router = useRouter();

  return (
    <div className="relative">
      {showBack && (
        <button
          type="button"
          onClick={onBack ?? (() => router.back())}
          aria-label="Back"
          className="absolute -left-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors duration-[120ms] ease-signal hover:bg-row-hover hover:text-primary"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="flex flex-col items-center gap-6 py-6">{children}</div>
    </div>
  );
}
