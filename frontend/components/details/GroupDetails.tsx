"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, BellOff, Search, Shield, ShieldOff, Timer, UserMinus, UserPlus, Users } from "lucide-react";
import type { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { AddMembersDialog } from "@/components/dialogs/AddMembersDialog";
import { DisappearingMessagesDialog } from "@/components/dialogs/DisappearingMessagesDialog";
import { getCurrentUserId } from "@/lib/session";
import { getUser } from "@/lib/users";
import { formatDisappearingDuration } from "@/lib/format";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useGroupActions } from "@/hooks/useGroupActions";

function ActionTile({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-lg py-3 text-secondary hover:bg-row-hover hover:text-primary"
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="text-[12px] font-medium">{label}</span>
    </button>
  );
}

export function GroupDetails({ conversation }: { conversation: Conversation }) {
  const [addOpen, setAddOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  const router = useRouter();

  const { toggleMute, setDisappearing } = useConversationActions();
  const { removeMember, setMemberRole } = useGroupActions();

  const activeMembers = (conversation.members ?? []).filter((m) => !m.leftAt);
  const me = activeMembers.find((m) => m.userId === getCurrentUserId());
  const isAdmin = me?.role === "admin";

  return (
    <div className="py-4">
      <div className="flex flex-col items-center gap-2 px-4 pb-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sidebar text-[26px] font-semibold text-secondary">
          {conversation.name?.[0]?.toUpperCase() ?? "G"}
        </div>
        <h2 className="text-[18px] font-semibold text-primary">{conversation.name}</h2>
        <p className="text-[13px] text-secondary">Group · {activeMembers.length} members</p>
      </div>

      <div className="mx-4 mb-4 flex divide-x divide-divider rounded-lg bg-sidebar">
        <ActionTile
          icon={conversation.isMuted ? BellOff : Bell}
          label={conversation.isMuted ? "Unmute" : "Mute"}
          onClick={() => toggleMute(conversation, !conversation.isMuted)}
        />
        <ActionTile icon={Search} label="Search" onClick={() => toast("Search in chat is coming soon")} />
        <ActionTile icon={UserPlus} label="Add" onClick={() => setAddOpen(true)} />
      </div>

      <div className="mx-4 mb-4 divide-y divide-divider rounded-lg bg-sidebar">
        <button
          type="button"
          onClick={() => setDisappearingOpen(true)}
          className="flex w-full items-center gap-3 rounded-t-lg px-3 py-3 text-left hover:bg-row-hover"
        >
          <Timer size={18} strokeWidth={1.75} className="text-secondary" />
          <span className="flex-1 text-[13.5px] text-primary">Disappearing messages</span>
          <span className="text-[13px] text-secondary">
            {formatDisappearingDuration(conversation.disappearingSeconds)}
          </span>
        </button>
      </div>

      <div className="mx-4 mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-secondary">
          {activeMembers.length} members
        </h3>
      </div>

      <div className="mx-4 mb-4 divide-y divide-divider rounded-lg bg-sidebar">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full items-center gap-3 rounded-t-lg px-3 py-3 text-left hover:bg-row-hover"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-on-accent">
            <UserPlus size={16} />
          </span>
          <span className="text-[13.5px] font-medium text-accent">Add members</span>
        </button>

        {activeMembers.map((member) => {
          const user = getUser(member.userId);
          if (!user) return null;
          const isSelf = member.userId === getCurrentUserId();
          return (
            <div key={member.userId} className="group/member flex items-center gap-3 px-3 py-2.5">
              <Avatar id={user.id} name={user.name} src={user.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] text-primary">
                    {isSelf ? "You" : user.name}
                  </span>
                  {member.role === "admin" && (
                    <span className="rounded-full bg-row-hover px-1.5 py-0.5 text-[10.5px] font-medium text-secondary">
                      Admin
                    </span>
                  )}
                </div>
              </div>
              {isAdmin && !isSelf && (
                <Menu>
                  <MenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Manage ${user.name}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary opacity-0 hover:bg-row-hover hover:text-primary group-hover/member:opacity-100"
                    >
                      <Users size={15} />
                    </button>
                  </MenuTrigger>
                  <MenuContent align="end">
                    {member.role === "admin" ? (
                      <MenuItem
                        onSelect={() => setMemberRole(conversation.id, member.userId, "member")}
                      >
                        <ShieldOff size={15} /> Remove admin
                      </MenuItem>
                    ) : (
                      <MenuItem
                        onSelect={() => setMemberRole(conversation.id, member.userId, "admin")}
                      >
                        <Shield size={15} /> Make admin
                      </MenuItem>
                    )}
                    <MenuItem danger onSelect={() => setRemoveTarget(member.userId)}>
                      <UserMinus size={15} /> Remove from group
                    </MenuItem>
                  </MenuContent>
                </Menu>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-4">
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="w-full rounded-lg px-3 py-3 text-left text-[13.5px] font-medium text-danger hover:bg-danger/10"
        >
          Leave group
        </button>
      </div>

      <AddMembersDialog conversation={conversation} open={addOpen} onOpenChange={setAddOpen} />

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={`Remove ${removeTarget ? getUser(removeTarget)?.name : ""}?`}
        description="They will no longer be able to send or receive messages in this group."
        confirmLabel="Remove"
        onConfirm={() => removeTarget && removeMember(conversation.id, removeTarget)}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave this group?"
        description="You won't be able to send or receive messages unless someone adds you back."
        confirmLabel="Leave"
        onConfirm={() => {
          const myId = getCurrentUserId();
          if (myId) removeMember(conversation.id, myId);
          router.push("/");
        }}
      />

      <DisappearingMessagesDialog
        open={disappearingOpen}
        onOpenChange={setDisappearingOpen}
        currentSeconds={conversation.disappearingSeconds}
        onConfirm={(seconds) => setDisappearing(conversation.id, seconds)}
      />
    </div>
  );
}
