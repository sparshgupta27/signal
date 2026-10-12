"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";

interface RenameGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onConfirm: (name: string) => void;
}

export function RenameGroupDialog({
  open,
  onOpenChange,
  currentName,
  onConfirm,
}: RenameGroupDialogProps) {
  const [name, setName] = useState(currentName);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== currentName;

  const save = () => {
    if (canSave) onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setName(currentName);
        onOpenChange(next);
      }}
    >
      <DialogContent width={360}>
        <DialogTitle>Group name</DialogTitle>
        <DialogDescription>This name is shown to everyone in the group.</DialogDescription>

        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            maxLength={128}
            aria-label="Group name"
          />
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={save} disabled={!canSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
