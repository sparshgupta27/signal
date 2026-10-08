"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Conversation } from "@/types";
import { useUiStore } from "@/store/uiStore";
import { ContactDetails } from "./ContactDetails";
import { GroupDetails } from "./GroupDetails";

export function DetailsPanel({ conversation }: { conversation: Conversation }) {
  const open = useUiStore((s) => s.detailsPanelOpen);
  const close = useUiStore((s) => s.closeDetailsPanel);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={conversation.id}
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-divider bg-app"
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
