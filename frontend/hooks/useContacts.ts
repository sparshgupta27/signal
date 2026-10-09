import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

export const contactsQueryKey = ["contacts"] as const;

export function useContacts() {
  const query = useQuery({ queryKey: contactsQueryKey, queryFn: api.getContacts });
  return { contacts: query.data ?? [], isLoading: query.isLoading };
}

export function useIsContact(userId: string | undefined): boolean {
  const { contacts } = useContacts();
  return !!userId && contacts.some((c) => c.id === userId);
}
