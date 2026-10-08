"use client";

import Link from "next/link";
import type { SearchResults as SearchResultsData } from "@/lib/mock/api";
import { Avatar } from "@/components/ui/Avatar";
import {
  getConversationAvatarId,
  getConversationAvatarUrl,
  getConversationTitle,
} from "@/lib/conversationDisplay";
import { formatListTime } from "@/lib/format";

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-accent/20 text-primary">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-sidebar px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
      {children}
    </div>
  );
}

export function SearchResults({ results, query }: { results: SearchResultsData; query: string }) {
  const { conversations, contacts, messages } = results;
  const empty = conversations.length === 0 && contacts.length === 0 && messages.length === 0;

  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-[13.5px] text-secondary">No results for &ldquo;{query}&rdquo;</p>
      </div>
    );
  }

  return (
    <div>
      {conversations.length > 0 && (
        <>
          <SectionLabel>Chats</SectionLabel>
          {conversations.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`} className="block px-2">
              <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-row-hover">
                <Avatar
                  id={getConversationAvatarId(c)}
                  name={getConversationTitle(c)}
                  src={getConversationAvatarUrl(c)}
                  size={40}
                />
                <span className="truncate text-[14px] text-primary">
                  {highlight(getConversationTitle(c), query)}
                </span>
              </div>
            </Link>
          ))}
        </>
      )}

      {contacts.length > 0 && (
        <>
          <SectionLabel>Contacts</SectionLabel>
          {contacts.map((u) => (
            <Link key={u.id} href={`/chat/new?userId=${u.id}`} className="block px-2">
              <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-row-hover">
                <Avatar id={u.id} name={u.name} src={u.avatarUrl} size={40} />
                <div className="min-w-0">
                  <div className="truncate text-[14px] text-primary">{highlight(u.name, query)}</div>
                  <div className="truncate text-[12.5px] text-secondary">@{u.username}</div>
                </div>
              </div>
            </Link>
          ))}
        </>
      )}

      {messages.length > 0 && (
        <>
          <SectionLabel>Messages</SectionLabel>
          {messages.map(({ conversation, message }) => (
            <Link key={message.id} href={`/chat/${conversation.id}`} className="block px-2">
              <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-row-hover">
                <Avatar
                  id={getConversationAvatarId(conversation)}
                  name={getConversationTitle(conversation)}
                  src={getConversationAvatarUrl(conversation)}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] text-primary">
                      {getConversationTitle(conversation)}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-secondary">
                      {formatListTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="truncate text-[12.5px] text-secondary">
                    {highlight(message.body, query)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
