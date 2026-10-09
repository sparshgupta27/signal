"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { getUser, getUsersVersion, subscribeUsers } from "@/lib/users";
import { avatarColorFor } from "@/lib/conversationDisplay";

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

interface TypingBubbleProps {
  typingUserIds: string[];
  isGroup: boolean;
}

export function TypingBubble({ typingUserIds, isGroup }: TypingBubbleProps) {
  // Subscribe to user directory updates so real name and avatar DP show up immediately
  useSyncExternalStore(subscribeUsers, getUsersVersion, () => 0);

  if (typingUserIds.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {typingUserIds.map((userId) => {
        const user = getUser(userId);
        const name = user?.name ?? "Someone";
        const avatarUrl = user?.avatarUrl;

        return (
          <div key={userId} className="mb-2 flex items-end px-4">
            {/* User DP / Avatar */}
            <div className="mr-2 w-7 shrink-0 self-end">
              <Avatar id={userId} name={name} src={avatarUrl} size={28} />
            </div>

            <div className="flex max-w-[85%] flex-col items-start md:max-w-[65%]">
              <div className="rounded-bubble rounded-bl-[4px] bg-bubble-in px-3.5 py-2 text-primary shadow-sm">
                {isGroup && (
                  <div
                    className="mb-1 text-[12.5px] font-semibold"
                    style={{ color: `var(--avatar-${avatarColorFor(userId)})` }}
                  >
                    {name}
                  </div>
                )}
                <div className="flex items-center gap-2 py-0.5">
                  <div className="flex items-center gap-1">
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
                  <span className="text-[11.5px] italic text-secondary">typing…</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
