"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { fileToResizedDataUrl } from "@/lib/image";

interface AvatarPickerProps {
  id: string;
  name: string;
  avatarUrl: string | null;
  onChange: (url: string | null) => void;
  size?: number;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function AvatarPicker({ id, name, avatarUrl, onChange, size = 96 }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That image is too large (max 8MB)");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      onChange(dataUrl);
    } catch {
      toast.error("Couldn't load that image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <Avatar id={id} name={name || "?"} src={avatarUrl} size={size} />

        {avatarUrl && (
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onChange(null)}
            className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-secondary shadow-menu ring-2 ring-[var(--bg-app)] transition-colors duration-[120ms] ease-signal hover:text-danger"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          aria-label="Change avatar"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-[var(--bg-app)] transition-colors duration-[120ms] ease-signal hover:bg-accent-hover disabled:opacity-60"
        >
          <Camera size={14} />
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="text-[13px] font-medium text-accent hover:underline disabled:opacity-60"
      >
        {loading ? "Uploading…" : avatarUrl ? "Change photo" : "Add photo"}
      </button>
    </div>
  );
}
