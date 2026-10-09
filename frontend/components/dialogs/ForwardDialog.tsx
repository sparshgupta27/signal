"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Search } from "lucide-react";
import type { Message } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import * as api from "@/lib/api";
import { useConversations } from "@/hooks/useConversations";
import {
  getConversationAvatarId,
  getConversationAvatarUrl,
  getConversationTitle,
} from "@/lib/conversationDisplay";

interface ForwardDialogProps {
  message: Message | null;
  onOpenChange: (open: boolean) => void;
}

export function ForwardDialog({ message, onOpenChange }: ForwardDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const { conversations } = useConversations();

  const candidates = useMemo(
    () =>
      conversations.filter((c) => getConversationTitle(c).toLowerCase().includes(query.toLowerCase())),
    [conversations, query]
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelected([]);
      setQuery("");
    }, 200);
  };

  const handleForward = async () => {
    if (!message || selected.length === 0) return;
    setSending(true);
    try {
      await api.forwardMessage(message.id, selected);
      toast(selected.length === 1 ? "Message forwarded" : `Message forwarded to ${selected.length} chats`);
      close();
    } catch {
      toast("Couldn't forward that message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent width={400}>
        <DialogTitle className="mb-3">Forward message</DialogTitle>
        <Input
          autoFocus
          placeholder="Search chats"
          leadingIcon={<Search size={16} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="mb-2"
        />
        <div className="max-h-64 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-secondary">No matching chats</p>
          ) : (
            candidates.map((c) => {
              const isSelected = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-row-hover"
                >
                  <Avatar
                    id={getConversationAvatarId(c)}
                    name={getConversationTitle(c)}
                    src={getConversationAvatarUrl(c)}
                    size={36}
                  />
                  <span className="flex-1 truncate text-left text-[14px] text-primary">
                    {getConversationTitle(c)}
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected ? "border-accent bg-accent text-on-accent" : "border-divider"
                    }`}
                  >
                    {isSelected && <Check size={13} />}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={selected.length === 0 || sending} onClick={handleForward}>
            {sending ? "Forwarding…" : `Forward (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
