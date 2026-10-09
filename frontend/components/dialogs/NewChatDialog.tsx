"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus, Users } from "lucide-react";
import type { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { NewGroupWizard } from "./NewGroupWizard";
import * as api from "@/lib/api";
import { conversationsQueryKey } from "@/hooks/useConversations";
import { useContacts } from "@/hooks/useContacts";

interface NewChatDialogProps {
  open: boolean;
  initialMode?: "browse" | "new-group";
  onOpenChange: (open: boolean) => void;
  onRequestAddContact: () => void;
}

export function NewChatDialog({
  open,
  initialMode = "browse",
  onOpenChange,
  onRequestAddContact,
}: NewChatDialogProps) {
  const [mode, setMode] = useState<"browse" | "new-group">(initialMode);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  // Radix keeps this content mounted across open/close toggles (that's what
  // the close-reset below already relies on), so a plain useState(initialMode)
  // wouldn't pick up a new initialMode on a later open — resync it here via
  // React's "adjust state while rendering" pattern whenever the dialog flips
  // from closed to open, e.g. Mod+Shift+N jumping straight to new-group.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMode(initialMode);
  }

  const { contacts, isLoading } = useContacts();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, ""))
    );
  }, [contacts, query]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        setMode("browse");
        setQuery("");
      }, 200);
    }
  };

  const startDirect = async (userId: string) => {
    const conversation = await api.createDirectConversation(userId);
    queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) => {
      if (!prev) return prev;
      const exists = prev.some((c) => c.id === conversation.id);
      return exists ? prev : api.sortConversations([...prev, conversation]);
    });
    handleOpenChange(false);
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent width={420}>
        {mode === "new-group" ? (
          <NewGroupWizard onBack={() => setMode("browse")} onClose={() => handleOpenChange(false)} />
        ) : (
          <>
            <DialogTitle className="mb-3">New chat</DialogTitle>
            <Input
              autoFocus
              placeholder="Search contacts"
              leadingIcon={<Search size={16} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              containerClassName="mb-2"
            />

            <div className="max-h-80 overflow-y-auto">
              <button
                type="button"
                onClick={() => setMode("new-group")}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 hover:bg-row-hover"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent">
                  <Users size={18} />
                </span>
                <span className="text-[14px] font-medium text-primary">New group</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenChange(false);
                  onRequestAddContact();
                }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 hover:bg-row-hover"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-on-accent">
                  <UserPlus size={18} />
                </span>
                <span className="text-[14px] font-medium text-primary">
                  Find by username / phone number
                </span>
              </button>

              <div className="my-1 h-px bg-divider" />

              {!isLoading && contacts.length > 0 && (
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary">
                  Contacts
                </div>
              )}

              {!isLoading && filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users size={24} className="text-secondary" />
                  <p className="text-[13.5px] text-secondary">
                    {contacts.length === 0
                      ? "No contacts yet — add one by username or phone number"
                      : "No matching contacts"}
                  </p>
                </div>
              ) : (
                filtered.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => startDirect(user.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 hover:bg-row-hover"
                  >
                    <Avatar id={user.id} name={user.name} src={user.avatarUrl} size={40} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[14px] text-primary">{user.name}</span>
                      <span className="block truncate text-[12.5px] text-secondary">@{user.username}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
