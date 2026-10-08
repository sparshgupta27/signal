"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  /** Bump this number to replay the shake animation (e.g. on a wrong code). */
  shakeKey?: number;
  error?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  shakeKey = 0,
  error,
  disabled,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH) onComplete?.(joined);
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, digit);
    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, "");
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const lastIndex = Math.min(pasted.length, LENGTH) - 1;
    refs.current[lastIndex]?.focus();
    if (pasted.length === LENGTH) onComplete?.(pasted);
  };

  return (
    <motion.div
      key={shakeKey}
      animate={shakeKey > 0 ? { x: [0, -8, 8, -8, 8, -4, 4, 0] } : undefined}
      transition={{ duration: 0.4 }}
      className="flex justify-center gap-2"
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-10 rounded-md border bg-input text-center text-[20px] font-semibold text-primary outline-none",
            "transition-colors duration-[120ms] ease-signal",
            "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30",
            error ? "border-danger" : "border-transparent"
          )}
        />
      ))}
    </motion.div>
  );
}
