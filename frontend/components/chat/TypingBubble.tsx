import { motion } from "framer-motion";

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

export function TypingBubble() {
  return (
    <div className="mb-3 flex items-end gap-2 px-4">
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
  );
}
