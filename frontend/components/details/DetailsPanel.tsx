"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Conversation } from "@/types";
import { useUiStore } from "@/store/uiStore";
import { useIsMobile, useIsTablet } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import { ContactDetails } from "./ContactDetails";
import { GroupDetails } from "./GroupDetails";

export function DetailsPanel({ conversation }: { conversation: Conversation }) {
  const open = useUiStore((s) => s.detailsPanelOpen);
  const close = useUiStore((s) => s.closeDetailsPanel);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Desktop keeps the 360px sidebar that shrinks the chat pane. Mobile and
  // tablet don't have the width to spare, so the panel covers the chat pane
  // instead ("overlays full pane" per the spec) — positioned against the
  // nearest relative ancestor, the chat route's own wrapper.
  const overlay = isMobile || isTablet;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={conversation.id}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className={cn(
            "flex flex-col overflow-y-auto bg-app",
            overlay
              ? "absolute inset-0 z-30 w-full shadow-menu"
              : "w-[360px] shrink-0 border-l border-divider"
          )}
        >
          <div className="flex h-15 shrink-0 items-center justify-between border-b border-divider px-4">
            <span className="text-[15px] font-semibold text-primary">
              {conversation.type === "group" ? "Group info" : "Contact info"}
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
            >
              <X size={18} />
            </button>
          </div>

          {conversation.type === "group" ? (
            <GroupDetails conversation={conversation} />
          ) : (
            <ContactDetails conversation={conversation} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
