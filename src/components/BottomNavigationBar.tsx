import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  const tabs = [
    { label: 'Home', route: 'Home' },
    { label: 'Map', route: 'MapDashboard' },
    { label: 'Settings', route: 'Settings' },
  ] as const;

  return (
    <View style={[styles.container, { paddingBottom }]}>
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
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  activeNavLabel: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
});

export default BottomNavigationBar;