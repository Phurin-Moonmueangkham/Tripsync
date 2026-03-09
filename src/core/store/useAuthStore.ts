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

const parseFirebaseError = (error: any): string => {
  const errorCode = error?.code || '';
  
  // Firebase auth error codes mapped to user-friendly messages
  const errorMap: Record<string, string> = {
    'auth/weak-password': 'รหัสผ่านอ่อนแอเกินไป (ต้องมีอย่างน้อย 6 ตัวอักษร)',
    'auth/email-already-in-use': 'อีเมลนี้ถูกใช้แล้ว',
    'auth/user-not-found': 'ไม่พบบัญชีที่ใช้อีเมลนี้',
    'auth/wrong-password': 'รหัสผ่านไม่ถูกต้อง',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/too-many-requests': 'ลองเข้าสู่ระบบมากเกินไป โปรดลองใหม่ในภายหลัง',
    'auth/operation-not-allowed': 'การสมัครสมาชิกปิดใช้งานแล้ว',
    'auth/account-exists-with-different-credential': 'บัญชีมีอยู่แล้ว',
    'auth/network-request-failed': 'ปัญหาเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    'auth/missing-email': 'กรุณาป้อนอีเมล',
    'auth/missing-password': 'กรุณาป้อนรหัสผ่าน',
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'permission-denied': 'บัญชีเข้าสู่ระบบได้แล้ว แต่ไม่มีสิทธิ์อ่านข้อมูลโปรไฟล์ใน Firestore',
  };
  
  return errorMap[errorCode] || error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
};

const buildFallbackProfile = (uid: string, email: string, name = ''): UserProfile => ({
  uid,
  name,
  email,
  phoneNumber: '',
});

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Try to parse Firebase error codes from the error message
    return parseFirebaseError(error);
  }

  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
};

const readUserProfile = async (uid: string, fallbackEmail: string): Promise<UserProfile> => {
  const userDocRef = doc(db, 'users', uid);
  try {
    const userSnapshot = await getDoc(userDocRef);

    if (!userSnapshot.exists()) {
      return buildFallbackProfile(uid, fallbackEmail);
    }

    const data = userSnapshot.data();

    return {
      uid,
      name: typeof data.name === 'string' ? data.name : '',
      email: typeof data.email === 'string' ? data.email : fallbackEmail,
      phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
    };
  } catch {
    // If Firestore user profile is blocked/unavailable, keep auth session usable.
    return buildFallbackProfile(uid, fallbackEmail);
  }
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
          const mergedProfile: UserProfile = {
            ...userProfile,
            name: userProfile.name || firebaseUser.displayName || '',
          };

          set({
            userProfile: mergedProfile,
            isAuthReady: true,
            isAuthLoading: false,
            authError: null,
          });
        } catch (error) {
          set({
            isAuthReady: true,
            isAuthLoading: false,
            authError: parseFirebaseError(error),
          });
        }
      },
      (error) => {
        set({
          isAuthReady: true,
          isAuthLoading: false,
          authError: parseFirebaseError(error),
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
      const mergedProfile: UserProfile = {
        ...userProfile,
        name: userProfile.name || credential.user.displayName || '',
      };

      set({
        userProfile: mergedProfile,
        isAuthLoading: false,
        authError: null,
      });
    } catch (error) {
      const message = parseFirebaseError(error);
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
      const message = parseFirebaseError(error);
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
      const message = parseFirebaseError(error);
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
      const message = parseFirebaseError(error);
      set({ isAuthLoading: false, authError: message });
      throw new Error(message);
    }
  },
}));
