import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomNavigationBarProps = {
  navigation: any;
  activeRoute: 'Home' | 'MapDashboard' | 'Settings';
  paddingBottom?: number;
};

const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  navigation,
  activeRoute,
  paddingBottom = 10,
}) => {
  const insets = useSafeAreaInsets();

  const tabs = [
    { label: 'Home', route: 'Home' },
    { label: 'Map', route: 'MapDashboard' },
    { label: 'Settings', route: 'Settings' },
  ] as const;

  return (
    <View style={[styles.container, { paddingBottom: paddingBottom + Math.round(insets.bottom * 0.67) }] }>
      {tabs.map((tab) => {
        const isActive = tab.route === activeRoute;

        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.navItem}
            disabled={isActive}
            onPress={() => {
              if (!isActive) {
                navigation.navigate(tab.route);
              }
            }}
          >
            <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 'auto',
    marginHorizontal: 12,
    marginBottom: 2,
    width: 'auto',
    paddingVertical: 16,
    backgroundColor: 'rgba(17, 24, 39, 0.94)',
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
    borderWidth: 1,
    borderColor: '#4B5563',
    borderRadius: 16,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activeNavLabel: {
    color: '#E5E7EB',
    fontWeight: '700',
  },
});

export default BottomNavigationBar;