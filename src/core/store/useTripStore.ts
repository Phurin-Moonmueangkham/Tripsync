import { create } from 'zustand';

// Simple mock store to prevent UI crashes on MapDashboard
interface Member {
  id: string;
  name: string;
  batteryLevel: number;
}

interface TripState {
  tripName: string;
  members: Member[];
  isSOSActive: boolean;
  triggerSOS: (isActive: boolean) => void;
  setTripName: (name: string) => void;
}

export const useTripStore = create<TripState>((set) => ({
  tripName: 'Trip to Japan',
  members: [
    { id: '1', name: 'You', batteryLevel: 85 },
    { id: '2', name: 'Mike', batteryLevel: 15 }, // Simulation low battery
    { id: '3', name: 'Sarah', batteryLevel: 92 },
  ],
  isSOSActive: false,
  triggerSOS: (isActive: boolean) => set({ isSOSActive: isActive }),
  setTripName: (name: string) => set({ tripName: name }),
}));