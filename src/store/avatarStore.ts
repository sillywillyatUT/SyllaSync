import { create } from "zustand";

interface AvatarState {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}

export const useAvatarStore = create<AvatarState>((set) => ({
  avatarUrl: null,
  setAvatarUrl: (url) => set({ avatarUrl: url }),
}));
