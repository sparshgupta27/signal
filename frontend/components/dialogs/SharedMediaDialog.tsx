"use client";

import { useState } from "react";
import { Download, File as FileIcon, ImageOff, Play } from "lucide-react";
import type { MessageAttachment } from "@/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useSharedMedia } from "@/hooks/useSharedMedia";

interface SharedMediaDialogProps {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharedMediaDialog({ conversationId, open, onOpenChange }: SharedMediaDialogProps) {
  const { media, isLoading } = useSharedMedia(conversationId);
  const [preview, setPreview] = useState<MessageAttachment | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={440}>
        <DialogTitle className="mb-3">Shared media</DialogTitle>

        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-secondary">Loading…</p>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ImageOff size={22} className="text-secondary" />
            <p className="text-[13.5px] text-secondary">No media shared yet</p>
          </div>
        ) : (
          <div className="grid max-h-[55vh] grid-cols-3 gap-1.5 overflow-y-auto">
            {media.map((item, i) =>
              item.kind === "image" ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreview(item)}
                  className="aspect-square overflow-hidden rounded-md bg-sidebar"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- authenticated remote URL, not an optimizable asset */}
                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                </button>
              ) : item.kind === "video" ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPreview(item)}
                  className="relative aspect-square overflow-hidden rounded-md bg-sidebar"
                >
                  <video src={item.url} className="h-full w-full object-cover" muted preload="metadata" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play size={22} className="fill-white text-white" />
                  </span>
                </button>
              ) : (
                <a
                  key={i}
                  href={item.url}
                  download={item.name}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md bg-sidebar px-2 text-center hover:bg-row-hover"
                >
                  <FileIcon size={20} className="text-secondary" />
                  <span className="w-full truncate text-[10.5px] text-secondary">{item.name}</span>
                </a>
              )
            )}
          </div>
        )}
      </DialogContent>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent width={640} className="flex items-center justify-center bg-transparent p-2 shadow-none">
          {preview && (
            <div className="relative">
              {preview.kind === "video" ? (
                <video src={preview.url} controls autoPlay className="max-h-[80vh] w-auto rounded-md" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- authenticated remote URL, not an optimizable asset
                <img src={preview.url} alt={preview.name} className="max-h-[80vh] w-auto rounded-md" />
              )}
              <a
                href={preview.url}
                download={preview.name}
                aria-label="Download"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <Download size={16} />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
