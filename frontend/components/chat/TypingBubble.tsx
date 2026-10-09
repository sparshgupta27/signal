"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { getUser, getUsersVersion, subscribeUsers } from "@/lib/users";

const dotVariants = {
  animate: (i: number) => ({
    opacity: [0.3, 1, 0.3],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      delay: i * 0.18,
      ease: "easeInOut" as const,
    },
  }),
};

function avatarColorFor(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return (hash % 12) + 1;
}

interface TypingBubbleProps {
  typingUserIds: string[];
  isGroup: boolean;
}

export function TypingBubble({ typingUserIds, isGroup }: TypingBubbleProps) {
  // getUser() is a plain synchronous read, not reactive on its own — without
  // this, a typer not yet in the directory cache would render with no name/
  // avatar and stay that way even once it arrives (see useSocketBridge for
  // the same pattern/reasoning).
  useSyncExternalStore(subscribeUsers, getUsersVersion, () => 0);

  if (typingUserIds.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {typingUserIds.map((userId) => {
        const user = getUser(userId);
        const name = user?.name ?? "Someone";

        return (
          <div key={userId} className="mb-0.5 flex items-end gap-2 px-4">
            {isGroup && (
              <Avatar id={userId} name={name} src={user?.avatarUrl} size={28} className="shrink-0" />
            )}
            <div className="flex max-w-[85%] flex-col items-start md:max-w-[65%]">
              {isGroup && (
                <span
                  className="mb-0.5 text-[12.5px] font-semibold"
                  style={{ color: `var(--avatar-${avatarColorFor(userId)})` }}
                >
                  {name}
                </span>
              )}
              <div className="flex items-center gap-1 rounded-bubble rounded-bl-[4px] bg-bubble-in px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    custom={i}
                    variants={dotVariants}
                    animate="animate"
                    className="h-1.5 w-1.5 rounded-full bg-secondary"
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
