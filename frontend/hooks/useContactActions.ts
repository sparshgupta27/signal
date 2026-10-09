import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { contactsQueryKey } from "./useContacts";

export function useContactActions() {
  const queryClient = useQueryClient();

  const addContact = useCallback(
    async (userId: string) => {
      await api.addContact(userId);
      await queryClient.invalidateQueries({ queryKey: contactsQueryKey });
      toast("Contact added");
    },
    [queryClient]
  );

  const removeContact = useCallback(
    async (userId: string) => {
      await api.removeContact(userId);
      await queryClient.invalidateQueries({ queryKey: contactsQueryKey });
      toast("Contact removed");
    },
    [queryClient]
  );

  return { addContact, removeContact };
}
