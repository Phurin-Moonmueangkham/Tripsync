import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { geocodeByText, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';

export default function MapDashboardScreen({ navigation }: any) {
  const mapRef = useRef<MapView>(null);
  const lastManualCameraChangeAt = useRef(0);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    currentTripCode,
    tripName,
    members,
    destination,
    destinationAddress,
    routePoints,
    isSOSActive,
    currentUserLocation,
    locationMode,
    tripError,
    triggerSOS,
    startLocationTracking,
    stopLocationTracking,
  } = useTripStore();

  const hasActiveTrip = Boolean(currentTripCode);

  useEffect(() => {
    void startLocationTracking();

    return () => {
      void stopLocationTracking();
    };
  }, [startLocationTracking, stopLocationTracking, locationMode]);

  const initialRegion = useMemo(() => {
    if (destination) {
      return {
        ...destination,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    if (currentUserLocation) {
      return {
        ...currentUserLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return {
      latitude: 13.7563,
      longitude: 100.5018,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    };
  }, [currentUserLocation, destination]);

  useEffect(() => {
    if (!hasActiveTrip) {
      return;
    }

    if (Date.now() - lastManualCameraChangeAt.current < 3500) {
      return;
    }

    const points = [
      ...routePoints,
      ...members.map((member) => member.location).filter((location) => location !== null),
      ...(destination ? [destination] : []),
    ];

    if (points.length < 2) {
      return;
    }

    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 50, bottom: 80, left: 50 },
      animated: true,
    });
  }, [destination, hasActiveTrip, members, routePoints]);

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      setSuggestions([]);
      setIsSuggestionLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsSuggestionLoading(true);
      getPlaceSuggestions(query, {
        language: 'th',
        location: currentUserLocation,
      })
        .then((items) => {
          setSuggestions(items);
        })
        .catch(() => {
          setSuggestions([]);
        })
        .finally(() => {
          setIsSuggestionLoading(false);
        });
    }, 280);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentUserLocation, searchText]);

  const handleSearch = async () => {
    const query = searchText.trim();

    if (!query || isSearching) {
      return;
    }

    try {
      setIsSearching(true);
      const result = await geocodeByText(query);
      setSearchedLocation(result.location);
      setSuggestions([]);
      lastManualCameraChangeAt.current = Date.now();
      mapRef.current?.animateToRegion(
        {
          ...result.location,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
      setSearchText(result.formattedAddress);
    } catch {
      setSearchText(query);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    if (isSearching) {
      return;
    }

    try {
      setIsSearching(true);
      const place = suggestion.isFallback || suggestion.placeId.startsWith('geocode:')
        ? await geocodeByText(suggestion.fullText)
        : await getPlaceDetailsById(suggestion.placeId);
      setSearchText(place.formattedAddress);
      setSearchedLocation(place.location);
      setSuggestions([]);
      lastManualCameraChangeAt.current = Date.now();
      mapRef.current?.animateToRegion(
        {
          ...place.location,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocateMe = async () => {
    if (isLocating) {
      return;
    }

    try {
      setIsLocating(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const latestLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      lastManualCameraChangeAt.current = Date.now();

      mapRef.current?.animateToRegion(
        {
          ...latestLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, !hasActiveTrip && styles.noTripContainer]}>
      {hasActiveTrip && isSOSActive ? (
        <View style={styles.sosBanner}>
          <Text style={styles.sosText}>🚨 ALERT! Someone needs help! 🚨</Text>
        </View>
      ) : null}

      {hasActiveTrip ? (
        <View style={styles.header}>
          <View>
            <Text style={styles.tripName}>{tripName || 'Trip Map'}</Text>
            <Text style={styles.memberCount}>👥 {members.length} Members</Text>
            <Text style={styles.modeText}>Mode: {locationMode.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={hasActiveTrip ? styles.mapCard : styles.mapFullScreen}>
        <MapView
          ref={mapRef}
          style={hasActiveTrip ? styles.map : styles.fullMap}
          initialRegion={initialRegion}
          mapType={mapType}
          showsUserLocation
        >
          {destination ? <Marker coordinate={destination} title="Destination" description={destinationAddress} pinColor="#FF9500" /> : null}

          {routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeColor="#007AFF" strokeWidth={4} /> : null}

          {searchedLocation ? <Marker coordinate={searchedLocation} title="Search Result" pinColor="#007AFF" /> : null}

          {members
            .filter((member) => member.location)
            .map((member) => {
              const isCurrentUser = member.id === userProfile?.uid;

              return (
                <Marker
                  key={member.id}
                  coordinate={member.location!}
                  title={isCurrentUser ? `${member.name} (You)` : member.name}
                  description={`Mode: ${member.locationMode.toUpperCase()}`}
                  pinColor={isCurrentUser ? '#007AFF' : '#34C759'}
                />
              );
            })}
        </MapView>

        <View style={styles.mapControls}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search place"
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={(value) => {
                setSearchText(value);
              }}
              onSubmitEditing={() => {
                void handleSearch();
              }}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
              onPress={() => {
                void handleSearch();
              }}
              disabled={isSearching}
            >
              <Text style={styles.searchButtonText}>{isSearching ? '...' : 'Search'}</Text>
            </TouchableOpacity>
          </View>

          {(isSuggestionLoading || suggestions.length > 0) && !isSearching ? (
            <View style={styles.suggestionList}>
              {isSuggestionLoading ? (
                <View style={styles.suggestionLoadingRow}>
                  <ActivityIndicator size="small" color="#1A1A2E" />
                </View>
              ) : (
                suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.placeId}
                    style={styles.suggestionItem}
                    onPress={() => {
                      void handleSelectSuggestion(item);
                    }}
                  >
                    <Text style={styles.suggestionTitle} numberOfLines={1}>{item.mainText}</Text>
                    {item.secondaryText ? <Text style={styles.suggestionSubtitle} numberOfLines={1}>{item.secondaryText}</Text> : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.mapTypeButton}
            onPress={() => {
              setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
            }}
          >
            <Text style={styles.mapTypeButtonText}>{mapType === 'standard' ? 'Satellite' : 'Map'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.locateButton, isLocating && styles.locateButtonDisabled]}
            onPress={() => {
              void handleLocateMe();
            }}
            disabled={isLocating}
          >
            {isLocating ? <ActivityIndicator size="small" color="#1A1A2E" /> : <Text style={styles.locateButtonIcon}>⌖</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {hasActiveTrip && tripError ? <Text style={styles.errorText}>{tripError}</Text> : null}

      {hasActiveTrip ? (
        <View style={styles.memberList}>
          <Text style={styles.sectionTitle}>Members Status</Text>
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <Text style={styles.memberAvatar}>👤</Text>
                <View style={styles.memberMeta}>
                  <Text style={styles.memberName}>{item.id === userProfile?.uid ? `${item.name} (You)` : item.name}</Text>
                  <Text style={styles.memberMode}>{item.locationMode.toUpperCase()} • {item.location ? 'Online' : 'Waiting GPS'}</Text>
                </View>
                <Text style={item.batteryLevel < 20 ? styles.lowBattery : styles.battery}>🔋 {item.batteryLevel}%</Text>
              </View>
            )}
          />
        </View>
      ) : null}

      {hasActiveTrip ? (
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('MeetingPoint')}>
            <Text style={styles.navBtnText}>📍 Set Point</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sosBtn, isSOSActive && styles.sosBtnActive]}
            onPress={() => {
              void triggerSOS(!isSOSActive);
            }}
          >
            <Text style={styles.sosBtnText}>{isSOSActive ? '✅ Cancel SOS' : '🚨 SOS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.navBtnText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.homeBottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navLabel}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.navLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  noTripContainer: { backgroundColor: '#FFFFFF' },
  sosBanner: { backgroundColor: '#D9534F', padding: 12, alignItems: 'center' },
  sosText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  tripName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A2E' },
  memberCount: { fontSize: 13, color: '#666', marginTop: 2 },
  modeText: { fontSize: 12, color: '#007AFF', marginTop: 2, fontWeight: '600' },
  settingsIcon: { fontSize: 24 },
  mapCard: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE1E6',
  },
  mapFullScreen: { flex: 1 },
  map: { height: 330, width: '100%' },
  fullMap: { flex: 1, width: '100%' },
  mapControls: {
    position: 'absolute',
    top: 24,
    left: 12,
    right: 12,
  },
  searchBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingHorizontal: 10, paddingVertical: 8 },
  searchButton: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  searchButtonDisabled: { backgroundColor: '#8FBFFF' },
  searchButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },
  mapTypeButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapTypeButtonText: { color: '#1A1A2E', fontWeight: '600', fontSize: 12 },
  suggestionList: {
    marginTop: 6,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  suggestionLoadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F6',
  },
  suggestionTitle: { color: '#1A1A2E', fontWeight: '600', fontSize: 13 },
  suggestionSubtitle: { color: '#666', fontSize: 12, marginTop: 2 },
  locateButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locateButtonDisabled: { opacity: 0.6 },
  locateButtonIcon: { color: '#1A1A2E', fontWeight: '700', fontSize: 20, lineHeight: 20 },
  errorText: { color: '#D9534F', marginTop: 8, marginHorizontal: 14 },
  memberList: { flex: 1, backgroundColor: 'white', marginTop: 10, paddingHorizontal: 16, paddingTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  memberAvatar: { fontSize: 18, marginRight: 8 },
  memberMeta: { flex: 1 },
  memberName: { fontSize: 15, color: '#333' },
  memberMode: { fontSize: 12, color: '#777', marginTop: 2 },
  battery: { fontSize: 14, color: 'green' },
  lowBattery: { fontSize: 14, color: 'red', fontWeight: 'bold' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navBtn: { padding: 10, borderRadius: 10, backgroundColor: '#F0F7FF' },
  navBtnText: { color: '#007AFF', fontWeight: '600' },
  sosBtn: { backgroundColor: '#D9534F', padding: 12, borderRadius: 12 },
  sosBtnActive: { backgroundColor: '#888' },
  sosBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  homeBottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 36,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 13, color: '#666', marginTop: 2 },
});
