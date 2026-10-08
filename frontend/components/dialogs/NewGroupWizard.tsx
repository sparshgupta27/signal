"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import * as api from "@/lib/mock/api";
import { conversationsQueryKey } from "@/hooks/useConversations";
import type { Conversation } from "@/types";

interface NewGroupWizardProps {
  onBack: () => void;
  onClose: () => void;
}

export function NewGroupWizard({ onBack, onClose }: NewGroupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({ queryKey: ["all-users"], queryFn: api.listAllUsers });

  const filtered = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())),
    [users, query]
  );

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    const conversation = await api.createGroup({ name: name.trim(), memberIds: selected });
    queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) =>
      prev ? api.sortConversations([...prev, conversation]) : prev
    );
    setCreating(false);
    onClose();
    router.push(`/chat/${conversation.id}`);
  };

  if (step === 2) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-[17px] font-semibold text-primary">Name this group</h2>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sidebar text-[28px] font-semibold text-secondary">
            {name.trim() ? name.trim()[0]?.toUpperCase() : "?"}
          </div>
          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            pill={false}
            className="text-center"
          />
          <p className="text-[12.5px] text-secondary">{selected.length} members selected</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!name.trim() || creating} onClick={handleCreate}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-secondary hover:bg-row-hover hover:text-primary"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-[17px] font-semibold text-primary">Add members</h2>
      </div>

      <Input
        autoFocus
        placeholder="Search"
        leadingIcon={<Search size={16} />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        containerClassName="mb-2"
      />

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const user = users.find((u) => u.id === id);
            if (!user) return null;
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full bg-row-hover py-1 pl-1 pr-2 text-[12.5px] text-primary"
              >
                <Avatar id={user.id} name={user.name} size={20} />
                {user.name.split(" ")[0]}
                <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${user.name}`}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto">
        {filtered.map((user) => {
          const isSelected = selected.includes(user.id);
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => toggle(user.id)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-row-hover"
            >
              <Avatar id={user.id} name={user.name} size={36} />
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
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" disabled={selected.length === 0} onClick={() => setStep(2)}>
          Next ({selected.length})
        </Button>
      </div>
    </div>
  );
}
