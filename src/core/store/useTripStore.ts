import * as Location from 'expo-location';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
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

interface TripState {
  currentTripCode: string | null;
  tripName: string;
  destination: Coordinate | null;
  destinationAddress: string;
  routePoints: Coordinate[];
  members: Member[];
  isSOSActive: boolean;
  locationMode: LocationMode;
  currentUserLocation: Coordinate | null;
  isTripLoading: boolean;
  tripError: string | null;
  isTrackingActive: boolean;
  createTrip: (payload: CreateTripPayload) => Promise<string>;
  joinTrip: (tripCode: string) => Promise<void>;
  leaveTrip: () => Promise<void>;
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

const toErrorMessage = (error: unknown): string => {
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
      destination: toCoordinate(data.destination),
      destinationAddress: typeof data.destinationAddress === 'string' ? data.destinationAddress : '',
      routePoints: Array.isArray(data.routePoints)
        ? data.routePoints
            .map((point) => toCoordinate(point))
            .filter((point): point is Coordinate => point !== null)
        : [],
      isSOSActive: Boolean(data.isSOSActive),
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

const baseState: Omit<TripState, 'createTrip' | 'joinTrip' | 'leaveTrip' | 'triggerSOS' | 'setLocationMode' | 'startLocationTracking' | 'stopLocationTracking' | 'clearTripError'> = {
  currentTripCode: null,
  tripName: '',
  destination: null,
  destinationAddress: '',
  routePoints: [],
  members: [],
  isSOSActive: false,
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

      await setDoc(doc(db, 'trips', tripCode), {
        tripCode,
        tripName: cleanTripName,
        destination,
        destinationAddress,
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
          batteryLevel: DEFAULT_BATTERY,
          locationMode: get().locationMode,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      subscribeTripData(tripCode, (partial) => set(partial));

      set({
        currentTripCode: tripCode,
        tripName: cleanTripName,
        destination,
        destinationAddress,
        routePoints,
        isSOSActive: false,
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
      const tripSnapshot = await getDoc(doc(db, 'trips', normalizedCode));

      if (!tripSnapshot.exists()) {
        throw new Error('Trip code not found.');
      }

      await setDoc(
        doc(db, 'trips', normalizedCode, 'members', firebaseUser.uid),
        {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName ?? 'You',
          email: firebaseUser.email ?? '',
          batteryLevel: DEFAULT_BATTERY,
          locationMode: get().locationMode,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      subscribeTripData(normalizedCode, (partial) => set(partial));

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
    clearFirestoreSubscriptions();
    clearTrackingResources();

    set({
      ...baseState,
    });
  },
  triggerSOS: async (isActive) => {
    const tripCode = get().currentTripCode;

    if (!tripCode) {
      return;
    }

    set({ isSOSActive: isActive });

    try {
      await setDoc(
        doc(db, 'trips', tripCode),
        {
          isSOSActive: isActive,
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

      set({ currentUserLocation: nextLocation, tripError: null });

      await setDoc(
        doc(db, 'trips', tripCode, 'members', firebaseUser.uid),
        {
          location: nextLocation,
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
