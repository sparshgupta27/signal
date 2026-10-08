import { Lock } from "lucide-react";

export function EncryptionNotice() {
  return (
    <div className="mx-auto my-4 flex max-w-sm flex-col items-center gap-2 rounded-lg bg-sidebar px-5 py-4 text-center">
      <Lock size={18} className="text-secondary" />
      <p className="text-[12.5px] leading-[18px] text-secondary">
        Messages and calls are end-to-end encrypted. No one outside of this
        chat, not even Signal Clone, can read or listen to them.{" "}
        <span className="cursor-pointer font-medium text-accent hover:underline">
          Learn more
        </span>
      </p>
    </div>
  );
}
