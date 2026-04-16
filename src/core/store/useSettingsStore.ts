import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  sosAlerts: boolean;
  proximityAlerts: boolean;
  setSosAlerts: (value: boolean) => void;
  setProximityAlerts: (value: boolean) => void;
  resetNotificationSettings: () => void;
}

const defaultSettings = {
  sosAlerts: true,
  proximityAlerts: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setSosAlerts: (value) => set({ sosAlerts: value }),
      setProximityAlerts: (value) => set({ proximityAlerts: value }),
      resetNotificationSettings: () => set(defaultSettings),
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