import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { useTripStore } from './useTripStore';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
}

interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}

interface AuthState {
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  isAuthReady: boolean;
  authError: string | null;
  initializeAuth: () => () => void;
  setUserProfile: (profile: UserProfile | null) => void;
  clearAuthError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

const readUserProfile = async (uid: string, fallbackEmail: string): Promise<UserProfile> => {
  const userDocRef = doc(db, 'users', uid);
  const userSnapshot = await getDoc(userDocRef);

  if (!userSnapshot.exists()) {
    return {
      uid,
      name: '',
      email: fallbackEmail,
      phoneNumber: '',
    };
  }

  const data = userSnapshot.data();

  return {
    uid,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : fallbackEmail,
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  userProfile: null,
  isAuthLoading: false,
  isAuthReady: false,
  authError: null,
  initializeAuth: () =>
    onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          set({
            userProfile: null,
            isAuthReady: true,
            isAuthLoading: false,
            authError: null,
          });
          return;
        }

        try {
          const userProfile = await readUserProfile(firebaseUser.uid, firebaseUser.email ?? '');

          set({
            userProfile,
            isAuthReady: true,
            isAuthLoading: false,
            authError: null,
          });
        } catch (error) {
          set({
            isAuthReady: true,
            isAuthLoading: false,
            authError: toErrorMessage(error),
          });
        }
      },
      (error) => {
        set({
          isAuthReady: true,
          isAuthLoading: false,
          authError: toErrorMessage(error),
        });
      },
    ),
  clearAuthError: () => set({ authError: null }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  signIn: async (email, password) => {
    set({ isAuthLoading: true, authError: null });

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userProfile = await readUserProfile(credential.user.uid, credential.user.email ?? email.trim());

      set({
        userProfile,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isAuthLoading: false, authError: message });
      throw new Error(message);
    }
  },
  requestPasswordReset: async (email) => {
    set({ isAuthLoading: true, authError: null });

    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        throw new Error('Please enter your email first.');
      }

      await sendPasswordResetEmail(auth, trimmedEmail);

      set({
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isAuthLoading: false, authError: message });
      throw new Error(message);
    }
  },
  signUp: async ({ name, email, password, phoneNumber }) => {
    set({ isAuthLoading: true, authError: null });

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedPhoneNumber = phoneNumber.trim();
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

      await updateProfile(credential.user, { displayName: trimmedName });

      await setDoc(
        doc(db, 'users', credential.user.uid),
        {
          name: trimmedName,
          email: trimmedEmail,
          phoneNumber: trimmedPhoneNumber,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      set({
        userProfile: {
          uid: credential.user.uid,
          name: trimmedName,
          email: trimmedEmail,
          phoneNumber: trimmedPhoneNumber,
        },
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isAuthLoading: false, authError: message });
      throw new Error(message);
    }
  },
  signOut: async () => {
    set({ isAuthLoading: true, authError: null });

    try {
      await useTripStore.getState().leaveTrip();
      await firebaseSignOut(auth);
      set({
        userProfile: null,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isAuthLoading: false, authError: message });
      throw new Error(message);
    }
  },
}));
