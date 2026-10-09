import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { getCurrentUser, updateSessionUser } from "@/lib/session";
import { primeUser } from "@/lib/users";

export const meQueryKey = ["me"] as const;

export interface MyProfile {
  name: string;
  about: string;
  avatarUrl: string | null;
  showLastSeen: boolean;
}

/** session.user (set at login, always immediately available) is the
 * fallback until the live GET /users/me resolves — avoids a blank flash
 * for a value we already know. */
export function useMyProfile(): MyProfile {
  const query = useQuery({ queryKey: meQueryKey, queryFn: api.getMe, staleTime: 60_000 });
  const user = query.data ?? getCurrentUser();
  return {
    name: user?.name ?? "",
    about: user?.about ?? "",
    avatarUrl: user?.avatarUrl ?? null,
    showLastSeen: user?.showLastSeen ?? true,
  };
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return async (patch: {
    name?: string;
    about?: string;
    avatarUrl?: string | null;
    showLastSeen?: boolean;
  }) => {
    const user = await api.updateMe(patch);
    updateSessionUser(user);
    // Keeps the shared user-directory cache (lib/users.ts) in sync too —
    // anything rendering "you" generically alongside other members (e.g.
    // a group's member list) reads through getUser(), not the session,
    // and would otherwise stay stuck on whatever avatar was cached at login.
    primeUser(user);
    queryClient.setQueryData(meQueryKey, user);
    return user;
  };
}
