"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import type { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import * as api from "@/lib/api";
import { useGroupActions } from "@/hooks/useGroupActions";

interface AddMembersDialogProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMembersDialog({ conversation, open, onOpenChange }: AddMembersDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { addMembers } = useGroupActions();

  const { data: users = [] } = useQuery({ queryKey: ["all-users"], queryFn: api.listAllUsers });

  const candidates = useMemo(
    () =>
      users.filter(
        (u) =>
          !conversation.memberIds.includes(u.id) && u.name.toLowerCase().includes(query.toLowerCase())
      ),
    [users, conversation.memberIds, query]
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleAdd = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await addMembers(conversation.id, selected);
    setSaving(false);
    setSelected([]);
    setQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent width={400}>
        <DialogTitle className="mb-3">Add members</DialogTitle>
        <Input
          autoFocus
          placeholder="Search"
          leadingIcon={<Search size={16} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="mb-2"
        />
        <div className="max-h-64 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-secondary">No matching contacts</p>
          ) : (
            candidates.map((user) => {
              const isSelected = selected.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggle(user.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-row-hover"
                >
                  <Avatar id={user.id} name={user.name} src={user.avatarUrl} size={36} />
                  <span className="flex-1 truncate text-left text-[14px] text-primary">{user.name}</span>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={selected.length === 0 || saving} onClick={handleAdd}>
            {saving ? "Adding…" : `Add (${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
