import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  sosAlerts: boolean;
  proximityAlerts: boolean;
  setSosAlerts: (value: boolean) => void;
  setProximityAlerts: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sosAlerts: true,
      proximityAlerts: false,
      setSosAlerts: (value) => set({ sosAlerts: value }),
      setProximityAlerts: (value) => set({ proximityAlerts: value }),
    }),
    {
      name: 'tripsync-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sosAlerts: state.sosAlerts,
        proximityAlerts: state.proximityAlerts,
      }),
    },
  ),
);