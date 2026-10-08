import { useSyncExternalStore } from "react";
import {
  getMyProfileServerSnapshot,
  getMyProfileSnapshot,
  subscribeMyProfile,
} from "@/lib/mock/profile";

export function useMyProfile() {
  return useSyncExternalStore(subscribeMyProfile, getMyProfileSnapshot, getMyProfileServerSnapshot);
}
