"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@/types";
import * as api from "@/lib/api";
import { conversationsQueryKey } from "@/hooks/useConversations";

function NewChatRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const userId = searchParams.get("userId");

  useEffect(() => {
    if (!userId) {
      router.replace("/");
      return;
    }
    api.createDirectConversation(userId).then((conversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (prev) => {
        if (!prev) return prev;
        const exists = prev.some((c) => c.id === conversation.id);
        return exists ? prev : api.sortConversations([...prev, conversation]);
      });
      router.replace(`/chat/${conversation.id}`);
    });
  }, [userId, router, queryClient]);

  return <div className="flex min-w-0 flex-1 bg-app" />;
}

/** Landing spot for "Message" links from search results: finds-or-creates the DM, then redirects. */
export default function NewChatRedirectPage() {
  return (
    <Suspense fallback={<div className="flex min-w-0 flex-1 bg-app" />}>
      <NewChatRedirect />
    </Suspense>
  );
}
