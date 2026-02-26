import { create } from 'zustand';

interface UserProfile {
  name: string;
  email: string;
  phoneNumber: string;
}

interface AuthState {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),
}));
