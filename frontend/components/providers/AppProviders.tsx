"use client";

import { Toaster } from "sonner";
import { ThemeProvider } from "./ThemeProvider";
import { QueryProvider } from "./QueryProvider";
import { TooltipProvider } from "@/components/ui/Tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  "!bg-elevated !text-primary !border !border-divider !shadow-menu !rounded-lg",
                description: "!text-secondary",
              },
            }}
          />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
