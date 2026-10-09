"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatListHeader } from "@/components/chat-list/ChatListHeader";
import { ChatListItem } from "@/components/chat-list/ChatListItem";
import { SearchField } from "@/components/chat-list/SearchField";
import { SearchResults } from "@/components/chat-list/SearchResults";
import { useConversations } from "@/hooks/useConversations";
import { useChatStore } from "@/store/chatStore";
import { useUiStore } from "@/store/uiStore";
import * as api from "@/lib/api";
import type { SearchResults as SearchResultsData } from "@/lib/api";
import { cn } from "@/lib/cn";

const MIN_WIDTH = 280;
const MAX_WIDTH = 440;
const DEFAULT_WIDTH = 340;
const STORAGE_KEY = "chat-list-width";

function ListSkeleton() {
  return (
    <div className="space-y-1 px-2 pt-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-2 py-2.5">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-row-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-row-hover" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-row-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyList({ unreadOnly, groupsOnly }: { unreadOnly: boolean; groupsOnly: boolean }) {
  const message =
    unreadOnly && groupsOnly
      ? "No unread groups"
      : groupsOnly
        ? "No groups yet"
        : unreadOnly
          ? "No unread chats"
          : "No chats yet — start one with the pencil button";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-[13.5px] text-secondary">{message}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors duration-[120ms] ease-signal",
        active ? "bg-accent text-on-accent" : "bg-row-hover text-secondary hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}

function readStoredWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : DEFAULT_WIDTH;
}

interface ListPaneProps {
  /** Mobile: the pane is the entire screen, not a sized sidebar — no stored width, no resize handle. */
  fullWidth?: boolean;
  /** Tablet: a fixed, non-resizable width per the spec (resizing a 300px pane isn't very useful). */
  compact?: boolean;
}

export function ListPane({ fullWidth = false, compact = false }: ListPaneProps) {
  const [width, setWidth] = useState(readStoredWidth);
  const [query, setQueryState] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [groupsOnly, setGroupsOnly] = useState(false);
  const [results, setResults] = useState<SearchResultsData | null>(null);
  const { conversations, isLoading } = useConversations();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const resizingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchFocusToken = useUiStore((s) => s.searchFocusToken);

  // Reacting to an external "focus the search field" signal (Mod+K) — an
  // imperative DOM call, not state sync, so this is exactly what an effect
  // is for. Also fires on mount with whatever token is already set, which
  // is what makes Mod+K work even when ListPane wasn't mounted yet.
  useEffect(() => {
    if (searchFocusToken > 0) searchInputRef.current?.focus();
  }, [searchFocusToken]);

  // Clearing results is a direct consequence of the user's edit, so it
  // happens here rather than as a derived effect watching `query`.
  const setQuery = (next: string) => {
    setQueryState(next);
    if (!next.trim()) setResults(null);
  };

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      api.searchAll(query).then((res) => {
        if (!cancelled) setResults(res);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    const onMove = (ev: PointerEvent) => {
      if (!resizingRef.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX - 68));
      setWidth(next);
    };
    const onUp = () => {
      resizingRef.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const visibleConversations = useMemo(() => {
    return conversations.filter(
      (c) => (!unreadOnly || c.unreadCount > 0) && (!groupsOnly || c.type === "group")
    );
  }, [conversations, unreadOnly, groupsOnly]);

  const isSearching = query.trim().length > 0;

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col bg-sidebar",
        fullWidth ? "w-full" : "border-r border-divider"
      )}
      style={fullWidth ? undefined : { width: compact ? 300 : width }}
    >
      <ChatListHeader />

      <div className="px-3 pb-2">
        <SearchField ref={searchInputRef} value={query} onChange={setQuery} />
      </div>

      {!isSearching && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <FilterChip
            label="All"
            active={!unreadOnly && !groupsOnly}
            onClick={() => {
              setUnreadOnly(false);
              setGroupsOnly(false);
            }}
          />
          <FilterChip label="Unread" active={unreadOnly} onClick={() => setUnreadOnly((v) => !v)} />
          <FilterChip label="Groups" active={groupsOnly} onClick={() => setGroupsOnly((v) => !v)} />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {isSearching ? (
          results ? (
            <SearchResults results={results} query={query} />
          ) : (
            <ListSkeleton />
          )
        ) : isLoading ? (
          <ListSkeleton />
        ) : visibleConversations.length === 0 ? (
          <EmptyList unreadOnly={unreadOnly} groupsOnly={groupsOnly} />
        ) : (
          <AnimatePresence initial={false}>
            {visibleConversations.map((c) => (
              <ChatListItem key={c.id} conversation={c} isActive={c.id === activeConversationId} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {!fullWidth && !compact && (
        <div
          onPointerDown={startResize}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none hover:bg-accent/30 active:bg-accent/40"
        />
      )}
    </div>
  );
}
