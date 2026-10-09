"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Search, UserX } from "lucide-react";
import type { Conversation } from "@/types";
import type { DirectoryUser } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import * as api from "@/lib/api";
import { conversationsQueryKey } from "@/hooks/useConversations";
import { useContactActions } from "@/hooks/useContactActions";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; user: DirectoryUser }
  | { status: "not-found" };

export function AddContactDialog({ open, onOpenChange }: AddContactDialogProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupState>({ status: "idle" });
  const [working, setWorking] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addContact, removeContact } = useContactActions();

  const handleLookup = async () => {
    if (!query.trim()) return;
    setResult({ status: "loading" });
    const user = await api.lookupUser(query);
    setResult(user ? { status: "found", user } : { status: "not-found" });
  };

  const handleToggleContact = async () => {
    if (result.status !== "found") return;
    setWorking(true);
    if (result.user.isContact) {
      await removeContact(result.user.id);
      setResult({ status: "found", user: { ...result.user, isContact: false } });
    } else {
      await addContact(result.user.id);
      setResult({ status: "found", user: { ...result.user, isContact: true } });
    }
    setWorking(false);
  };

  const handleMessage = async (userId: string) => {
    const conversation = await api.createDirectConversation(userId);
    queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) => {
      if (!prev) return prev;
      const exists = prev.some((c) => c.id === conversation.id);
      return exists ? prev : api.sortConversations([...prev, conversation]);
    });
    handleClose();
    router.push(`/chat/${conversation.id}`);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setQuery("");
      setResult({ status: "idle" });
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent width={400}>
        <DialogTitle className="mb-1">Add contact</DialogTitle>
        <p className="mb-3 text-[13px] text-secondary">
          Find someone by their username or phone number.
        </p>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="username.01 or +91 90000 00001"
            leadingIcon={<Search size={16} />}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (result.status !== "idle") setResult({ status: "idle" });
            }}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            containerClassName="flex-1"
          />
          <Button variant="primary" disabled={!query.trim()} onClick={handleLookup}>
            Search
          </Button>
        </div>

        <div className="mt-4">
          {result.status === "loading" && (
            <p className="py-8 text-center text-[13px] text-secondary">Searching…</p>
          )}

          {result.status === "not-found" && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <UserX size={24} className="text-secondary" />
              <p className="text-[13.5px] text-secondary">Not a Signal user</p>
            </div>
          )}

          {result.status === "found" && (
            <div className="flex flex-col items-center gap-3 rounded-lg bg-sidebar px-5 py-5 text-center">
              <Avatar
                id={result.user.id}
                name={result.user.name}
                src={result.user.avatarUrl}
                size={64}
              />
              <div>
                <div className="text-[15px] font-semibold text-primary">{result.user.name}</div>
                <div className="text-[13px] text-secondary">@{result.user.username}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleMessage(result.user.id)}>
                  Message
                </Button>
                <Button
                  variant={result.user.isContact ? "ghost" : "primary"}
                  disabled={working}
                  onClick={handleToggleContact}
                >
                  {result.user.isContact ? "Remove contact" : "Add to contacts"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
