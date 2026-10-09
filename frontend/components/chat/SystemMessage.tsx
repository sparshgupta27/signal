import type { Message } from "@/types";
import { CURRENT_USER_ID, getUser } from "@/lib/mock/data";
import { formatDisappearingDuration } from "@/lib/format";

function nameOf(id: string | undefined): string {
  if (!id) return "Someone";
  if (id === CURRENT_USER_ID) return "You";
  return getUser(id)?.name ?? "Someone";
}

export function systemMessageText(message: Message): string {
  const event = message.systemEvent;
  if (!event) return message.body;

  const actor = nameOf(event.actorId);
  const target = nameOf(event.targetId);

  switch (event.action) {
    case "created":
      return `${actor} created the group`;
    case "member_added":
      return actor === "You" ? `You added ${target}` : `${actor} added ${target}`;
    case "member_removed":
      return actor === target
        ? `${actor} left the group`
        : actor === "You"
          ? `You removed ${target}`
          : `${actor} removed ${target}`;
    case "member_left":
      return `${actor} left the group`;
    case "member_promoted":
      return `${actor} made ${target} an admin`;
    case "member_demoted":
      return `${actor} removed ${target} as admin`;
    case "name_changed":
      return `${actor} changed the group name to "${event.value}"`;
    case "disappearing_changed": {
      const seconds = event.value ? Number(event.value) : 0;
      return seconds
        ? `${actor} set the disappearing message timer to ${formatDisappearingDuration(seconds)}`
        : `${actor} turned off disappearing messages`;
    }
    default:
      return message.body;
  }
}

export function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="my-2 flex justify-center px-10">
      <span className="rounded-md px-3 py-1 text-center text-[12px] text-secondary">
        {systemMessageText(message)}
      </span>
    </div>
  );
}
