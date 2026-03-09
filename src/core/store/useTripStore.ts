import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { create } from 'zustand';
import { auth, db } from '../firebase/firebase';

type LocationMode = 'high' | 'balanced' | 'smart';

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Member = {
  id: string;
  name: string;
  email: string;
  batteryLevel: number;
  locationMode: LocationMode;
  location: Coordinate | null;
  lastUpdatedAt: number | null;
};

type CreateTripPayload = {
  tripName: string;
  destination: Coordinate;
  destinationAddress: string;
  routePoints: Coordinate[];
};

type ReachMap = Record<string, boolean>;

interface TripState {
  currentTripCode: string | null;
  tripName: string;
  ownerId: string | null;
  destination: Coordinate | null;
  destinationAddress: string;
  meetingPoint: Coordinate | null;
  meetingPointAddress: string;
  meetingPointSetterId: string | null;
  meetingPointSetterName: string | null;
  meetingPointSetAtMs: number | null;
  meetingReachedBy: ReachMap;
  destinationReachedBy: ReachMap;
  isTripCompleted: boolean;
  routePoints: Coordinate[];
  members: Member[];
  isSOSActive: boolean;
  sosActivatorId: string | null;
  sosActivatorName: string | null;
  sosActivatorLocation: Coordinate | null;
  locationMode: LocationMode;
  currentUserLocation: Coordinate | null;
  isTripLoading: boolean;
  tripError: string | null;
  isTrackingActive: boolean;
  createTrip: (payload: CreateTripPayload) => Promise<string>;
  joinTrip: (tripCode: string) => Promise<void>;
  leaveTrip: () => Promise<void>;
  setMeetingPoint: (payload: { coordinate: Coordinate; address: string }) => Promise<void>;
  clearMeetingPoint: () => Promise<void>;
  markMeetingReached: () => Promise<void>;
  markDestinationReached: () => Promise<void>;
  completeTrip: () => Promise<void>;
  triggerSOS: (isActive: boolean) => Promise<void>;
  setLocationMode: (mode: LocationMode) => Promise<void>;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => Promise<void>;
  clearTripError: () => void;
}

const DEFAULT_BATTERY = 85;
const TRIP_CODE_LENGTH = 6;

let tripUnsubscribe: (() => void) | null = null;
let membersUnsubscribe: (() => void) | null = null;
let locationSubscription: Location.LocationSubscription | null = null;
let smartTrackingInterval: ReturnType<typeof setInterval> | null = null;

// localStorage helpers for persistence
const saveTripCodeToStorage = (tripCode: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('activeTripCode', tripCode);
    }
  } catch {
    // Silently fail if localStorage is not available
  }
};

const clearTripCodeFromStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('activeTripCode');
    }
  } catch {
    // Silently fail if localStorage is not available
  }
};

export const getStoredTripCode = (): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('activeTripCode');
    }
  } catch {
    // Silently fail if localStorage is not available
  }
  return null;
};

const toErrorMessage = (error: unknown): string => {
  const errorCode = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as any).code)
    : '';

  const firebaseErrorMap: Record<string, string> = {
    'permission-denied': 'ไม่มีสิทธิ์เข้าถึงข้อมูลทริป (Firestore rules)',
    'unauthenticated': 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    'unavailable': 'Firebase ยังไม่พร้อมใช้งานในขณะนี้ กรุณาลองใหม่',
  };

  if (firebaseErrorMap[errorCode]) {
    return firebaseErrorMap[errorCode];
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

const clearFirestoreSubscriptions = () => {
  tripUnsubscribe?.();
  membersUnsubscribe?.();
  tripUnsubscribe = null;
  membersUnsubscribe = null;
};

const clearTrackingResources = () => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }

  if (smartTrackingInterval) {
    clearInterval(smartTrackingInterval);
    smartTrackingInterval = null;
  }
};

const generateTripCode = (): string => {
  return Math.random()
    .toString(36)
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, TRIP_CODE_LENGTH)
    .padEnd(TRIP_CODE_LENGTH, 'X');
};

const getUniqueTripCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateTripCode();
    const tripSnapshot = await getDoc(doc(db, 'trips', code));

    if (!tripSnapshot.exists()) {
      return code;
    }
  }

  throw new Error('Unable to create trip code. Please try again.');
};

const toCoordinate = (input: unknown): Coordinate | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const latitude = (input as { latitude?: unknown }).latitude;
  const longitude = (input as { longitude?: unknown }).longitude;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return { latitude, longitude };
};

const toReachMap = (input: unknown): ReachMap => {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, value]) => value === true)
    .map(([key]) => [key, true] as const);

  return Object.fromEntries(entries) as ReachMap;
};

const getCurrentBatteryLevel = async (): Promise<number> => {
  try {
    const batteryLevel = await Battery.getBatteryLevelAsync();

    if (!Number.isFinite(batteryLevel) || batteryLevel < 0) {
      return DEFAULT_BATTERY;
    }

    return Math.max(0, Math.min(100, Math.round(batteryLevel * 100)));
  } catch {
    return DEFAULT_BATTERY;
  }
};

const subscribeTripData = (tripCode: string, set: (partial: Partial<TripState>) => void) => {
  clearFirestoreSubscriptions();

  tripUnsubscribe = onSnapshot(doc(db, 'trips', tripCode), (tripSnapshot) => {
    if (!tripSnapshot.exists()) {
      set({
        tripError: 'Trip not found.',
      });
      return;
    }

    const data = tripSnapshot.data();

    set({
      currentTripCode: tripCode,
      tripName: typeof data.tripName === 'string' ? data.tripName : 'Unknown Trip',
      ownerId: typeof data.ownerId === 'string' ? data.ownerId : null,
      destination: toCoordinate(data.destination),
      destinationAddress: typeof data.destinationAddress === 'string' ? data.destinationAddress : '',
      meetingPoint: toCoordinate(data.meetingPoint),
      meetingPointAddress: typeof data.meetingPointAddress === 'string' ? data.meetingPointAddress : '',
      meetingPointSetterId: typeof data.meetingPointSetterId === 'string' ? data.meetingPointSetterId : null,
      meetingPointSetterName: typeof data.meetingPointSetterName === 'string' ? data.meetingPointSetterName : null,
      meetingPointSetAtMs: typeof data.meetingPointSetAtMs === 'number' ? data.meetingPointSetAtMs : null,
      meetingReachedBy: toReachMap(data.meetingReachedBy),
      destinationReachedBy: toReachMap(data.destinationReachedBy),
      isTripCompleted: Boolean(data.isTripCompleted),
      routePoints: Array.isArray(data.routePoints)
        ? data.routePoints
            .map((point) => toCoordinate(point))
            .filter((point): point is Coordinate => point !== null)
        : [],
      isSOSActive: Boolean(data.isSOSActive),
      sosActivatorId: typeof data.sosActivatorId === 'string' ? data.sosActivatorId : null,
      sosActivatorName: typeof data.sosActivatorName === 'string' ? data.sosActivatorName : null,
      sosActivatorLocation: toCoordinate(data.sosActivatorLocation),
      isTripLoading: false,
      tripError: null,
    });
  });

  membersUnsubscribe = onSnapshot(collection(db, 'trips', tripCode, 'members'), (snapshot) => {
    const members: Member[] = snapshot.docs.map((memberDoc) => {
      const data = memberDoc.data();

      const locationMode =
        data.locationMode === 'high' || data.locationMode === 'balanced' || data.locationMode === 'smart'
          ? data.locationMode
          : 'balanced';

      return {
        id: memberDoc.id,
        name: typeof data.name === 'string' ? data.name : 'Member',
        email: typeof data.email === 'string' ? data.email : '',
        batteryLevel: typeof data.batteryLevel === 'number' ? data.batteryLevel : DEFAULT_BATTERY,
        locationMode,
        location: toCoordinate(data.location),
        lastUpdatedAt: typeof data.lastUpdatedAt === 'number' ? data.lastUpdatedAt : null,
      };
    });

    set({ members });
  });
};

const baseState: Omit<TripState, 'createTrip' | 'joinTrip' | 'leaveTrip' | 'setMeetingPoint' | 'clearMeetingPoint' | 'markMeetingReached' | 'markDestinationReached' | 'completeTrip' | 'triggerSOS' | 'setLocationMode' | 'startLocationTracking' | 'stopLocationTracking' | 'clearTripError'> = {
  currentTripCode: null,
  tripName: '',
  ownerId: null,
  destination: null,
  destinationAddress: '',
  meetingPoint: null,
  meetingPointAddress: '',
  meetingPointSetterId: null,
  meetingPointSetterName: null,
  meetingPointSetAtMs: null,
  meetingReachedBy: {},
  destinationReachedBy: {},
  isTripCompleted: false,
  routePoints: [],
  members: [],
  isSOSActive: false,
  sosActivatorId: null,
  sosActivatorName: null,
  sosActivatorLocation: null,
  locationMode: 'balanced',
  currentUserLocation: null,
  isTripLoading: false,
  tripError: null,
  isTrackingActive: false,
};

export const useTripStore = create<TripState>((set, get) => ({
  ...baseState,
  clearTripError: () => set({ tripError: null }),
  createTrip: async ({ tripName, destination, destinationAddress, routePoints }) => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error('Please sign in first.');
    }

    set({ isTripLoading: true, tripError: null });

    try {
      const tripCode = await getUniqueTripCode();
      const cleanTripName = tripName.trim();
      const batteryLevel = await getCurrentBatteryLevel();

      await setDoc(doc(db, 'trips', tripCode), {
        tripCode,
        tripName: cleanTripName,
        destination,
        destinationAddress,
        meetingPoint: null,
        meetingPointAddress: '',
        meetingPointSetterId: null,
        meetingPointSetterName: null,
        meetingPointSetAtMs: null,
        meetingReachedBy: {},
        destinationReachedBy: {},
        isTripCompleted: false,
        routePoints,
        ownerId: firebaseUser.uid,
        isSOSActive: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, 'trips', tripCode, 'members', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName ?? 'You',
          email: firebaseUser.email ?? '',
          batteryLevel,
          locationMode: get().locationMode,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      subscribeTripData(tripCode, (partial) => set(partial));

      saveTripCodeToStorage(tripCode);

      set({
        currentTripCode: tripCode,
        tripName: cleanTripName,
        ownerId: firebaseUser.uid,
        destination,
        destinationAddress,
        meetingPoint: null,
        meetingPointAddress: '',
        meetingPointSetterId: null,
        meetingPointSetterName: null,
        meetingPointSetAtMs: null,
        meetingReachedBy: {},
        destinationReachedBy: {},
        isTripCompleted: false,
        routePoints,
        isSOSActive: false,
        sosActivatorId: null,
        sosActivatorName: null,
        sosActivatorLocation: null,
        isTripLoading: false,
        tripError: null,
      });

      return tripCode;
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isTripLoading: false, tripError: message });
      throw new Error(message);
    }
  },
  joinTrip: async (tripCode) => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      throw new Error('Please sign in first.');
    }

    set({ isTripLoading: true, tripError: null });

    try {
      const normalizedCode = tripCode.trim().toUpperCase();
      const batteryLevel = await getCurrentBatteryLevel();
      const tripSnapshot = await getDoc(doc(db, 'trips', normalizedCode));

      if (!tripSnapshot.exists()) {
        throw new Error('Trip code not found.');
      }

      if (tripSnapshot.data().isTripCompleted) {
        clearTripCodeFromStorage();
        throw new Error('Trip already ended.');
      }

      await setDoc(
        doc(db, 'trips', normalizedCode, 'members', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName ?? 'You',
          email: firebaseUser.email ?? '',
          batteryLevel,
          locationMode: get().locationMode,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      subscribeTripData(normalizedCode, (partial) => set(partial));

      saveTripCodeToStorage(normalizedCode);

      set({
        currentTripCode: normalizedCode,
        isTripLoading: false,
        tripError: null,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isTripLoading: false, tripError: message });
      throw new Error(message);
    }
  },
  leaveTrip: async () => {
    const firebaseUser = auth.currentUser;
    const tripCode = get().currentTripCode;

    set({ isTripLoading: true, tripError: null });
    clearTrackingResources();

    try {
      if (firebaseUser && tripCode) {
        await deleteDoc(doc(db, 'trips', tripCode, 'members', firebaseUser.uid));
      }

      clearFirestoreSubscriptions();
      clearTripCodeFromStorage();

      set({
        ...baseState,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      set({ isTripLoading: false, tripError: message });
      throw new Error(message);
    }
  },
  setMeetingPoint: async ({ coordinate, address }) => {
    const tripCode = get().currentTripCode;
    const firebaseUser = auth.currentUser;
    const ownerId = get().ownerId;

    if (!tripCode || !firebaseUser) {
      throw new Error('Trip is not active.');
    }

    if (!ownerId || firebaseUser.uid !== ownerId) {
      throw new Error('Only trip owner can set the meeting point.');
    }

    const setterName = firebaseUser.displayName ?? 'Member';

    set({
      meetingPoint: coordinate,
      meetingPointAddress: address,
      meetingPointSetterId: firebaseUser.uid,
      meetingPointSetterName: setterName,
      meetingPointSetAtMs: Date.now(),
      meetingReachedBy: {},
      tripError: null,
    });

    try {
      await setDoc(
        doc(db, 'trips', tripCode),
        {
          meetingPoint: coordinate,
          meetingPointAddress: address,
          meetingPointSetterId: firebaseUser.uid,
          meetingPointSetterName: setterName,
          meetingPointSetAtMs: Date.now(),
          meetingReachedBy: {},
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      set({ tripError: toErrorMessage(error) });
      throw error;
    }
  },
  clearMeetingPoint: async () => {
    const tripCode = get().currentTripCode;
    const firebaseUser = auth.currentUser;
    const ownerId = get().ownerId;

    if (!tripCode || !firebaseUser) {
      return;
    }

    if (!ownerId || firebaseUser.uid !== ownerId) {
      throw new Error('Only trip owner can cancel the meeting point.');
    }

    set({
      meetingPoint: null,
      meetingPointAddress: '',
      meetingPointSetterId: null,
      meetingPointSetterName: null,
      meetingPointSetAtMs: null,
      meetingReachedBy: {},
      tripError: null,
    });

    try {
      await setDoc(
        doc(db, 'trips', tripCode),
        {
          meetingPoint: null,
          meetingPointAddress: '',
          meetingPointSetterId: null,
          meetingPointSetterName: null,
          meetingPointSetAtMs: null,
          meetingReachedBy: {},
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      set({ tripError: toErrorMessage(error) });
      throw error;
    }
  },
  markMeetingReached: async () => {
    const tripCode = get().currentTripCode;
    const firebaseUser = auth.currentUser;

    if (!tripCode || !firebaseUser) {
      return;
    }

    const uid = firebaseUser.uid;

    set({
      meetingReachedBy: {
        ...get().meetingReachedBy,
        [uid]: true,
      },
    });

    try {
      await updateDoc(doc(db, 'trips', tripCode), {
        [`meetingReachedBy.${uid}`]: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      set({ tripError: toErrorMessage(error) });
    }
  },
  markDestinationReached: async () => {
    const tripCode = get().currentTripCode;
    const firebaseUser = auth.currentUser;

    if (!tripCode || !firebaseUser) {
      return;
    }

    const uid = firebaseUser.uid;

    set({
      destinationReachedBy: {
        ...get().destinationReachedBy,
        [uid]: true,
      },
    });

    try {
      await updateDoc(doc(db, 'trips', tripCode), {
        [`destinationReachedBy.${uid}`]: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      set({ tripError: toErrorMessage(error) });
    }
  },
  completeTrip: async () => {
    const tripCode = get().currentTripCode;

    if (!tripCode) {
      return;
    }

    try {
      await setDoc(
        doc(db, 'trips', tripCode),
        {
          isTripCompleted: true,
          meetingPoint: null,
          meetingPointAddress: '',
          meetingPointSetterId: null,
          meetingPointSetterName: null,
          meetingPointSetAtMs: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      set({ tripError: toErrorMessage(error) });
    }
  },
  triggerSOS: async (isActive) => {
    const tripCode = get().currentTripCode;
    const firebaseUser = auth.currentUser;
    const currentUserLocation = get().currentUserLocation;

    if (!tripCode || !firebaseUser) {
      return;
    }

    set({
      isSOSActive: isActive,
      sosActivatorId: isActive ? firebaseUser.uid : null,
      sosActivatorName: isActive ? (firebaseUser.displayName ?? 'Unknown') : null,
      sosActivatorLocation: isActive ? currentUserLocation : null,
    });

    try {
      await setDoc(
        doc(db, 'trips', tripCode),
        {
          isSOSActive: isActive,
          sosActivatorId: isActive ? firebaseUser.uid : null,
          sosActivatorName: isActive ? (firebaseUser.displayName ?? 'Unknown') : null,
          sosActivatorLocation: isActive ? currentUserLocation : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      set({ tripError: toErrorMessage(error) });
    }
  },
  setLocationMode: async (mode) => {
    const firebaseUser = auth.currentUser;
    const tripCode = get().currentTripCode;

    set({ locationMode: mode });

    if (firebaseUser && tripCode) {
      await setDoc(
        doc(db, 'trips', tripCode, 'members', firebaseUser.uid),
        {
          locationMode: mode,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (get().isTrackingActive) {
      await get().startLocationTracking();
    }
  },
  startLocationTracking: async () => {
    const firebaseUser = auth.currentUser;
    const tripCode = get().currentTripCode;

    if (!firebaseUser || !tripCode) {
      return;
    }

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      set({ tripError: 'Location permission is required.', isTrackingActive: false });
      return;
    }

    clearTrackingResources();

    const pushLocation = async (location: Location.LocationObject) => {
      const nextLocation: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      const batteryLevel = await getCurrentBatteryLevel();

      set({ currentUserLocation: nextLocation, tripError: null });

      await setDoc(
        doc(db, 'trips', tripCode, 'members', firebaseUser.uid),
        {
          location: nextLocation,
          batteryLevel,
          locationMode: get().locationMode,
          lastUpdatedAt: Date.now(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    };

    const selectedMode = get().locationMode;

    try {
      if (selectedMode === 'smart') {
        const firstLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        await pushLocation(firstLocation);

        smartTrackingInterval = setInterval(() => {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then((location) => pushLocation(location))
            .catch((error) => {
              set({ tripError: toErrorMessage(error) });
            });
        }, 25000);
      } else {
        const config =
          selectedMode === 'high'
            ? {
                accuracy: Location.Accuracy.Highest,
                timeInterval: 2000,
                distanceInterval: 3,
              }
            : {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 12000,
                distanceInterval: 30,
              };

        locationSubscription = await Location.watchPositionAsync(config, (location) => {
          pushLocation(location).catch((error) => {
            set({ tripError: toErrorMessage(error) });
          });
        });
      }

      set({ isTrackingActive: true, tripError: null });
    } catch (error) {
      set({ isTrackingActive: false, tripError: toErrorMessage(error) });
    }
  },
  stopLocationTracking: async () => {
    clearTrackingResources();
    set({ isTrackingActive: false });
  },
}));
