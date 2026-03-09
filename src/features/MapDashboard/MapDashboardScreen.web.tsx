import * as Location from 'expo-location';
import maplibregl from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { geocodeByText, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './MapDashboard.styles';

const MAP_SOURCE_ID = 'trip-points-source';
const MAP_LAYER_ID = 'trip-points-layer';
const MAP_LABEL_LAYER_ID = 'trip-points-label-layer';
const ROUTE_SOURCE_ID = 'trip-route-source';
const ROUTE_LAYER_ID = 'trip-route-layer';

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-base-layer',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export default function MapDashboardScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinLocation, setDroppedPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinAddress, setDroppedPinAddress] = useState<string>('');
  const [isInAppNavigation, setIsInAppNavigation] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasActiveTripRef = useRef(false);

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    currentTripCode,
    tripName,
    ownerId,
    members,
    destination,
    destinationAddress,
    routePoints,
    isSOSActive,
    sosActivatorId,
    sosActivatorName,
    sosActivatorLocation,
    currentUserLocation,
    locationMode,
    tripError,
    triggerSOS,
    startLocationTracking,
    stopLocationTracking,
  } = useTripStore();

  const hasActiveTrip = Boolean(currentTripCode);

  useEffect(() => {
    hasActiveTripRef.current = hasActiveTrip;
  }, [hasActiveTrip]);

  const activeLocation = useMemo(() => {
    if (droppedPinLocation) {
      return droppedPinLocation;
    }

    if (searchedLocation) {
      return searchedLocation;
    }

    if (destination) {
      return destination;
    }

    return currentUserLocation;
  }, [currentUserLocation, destination, searchedLocation, droppedPinLocation]);

  useEffect(() => {
    void startLocationTracking();

    return () => {
      void stopLocationTracking();
    };
  }, [startLocationTracking, stopLocationTracking, locationMode]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: [100.5018, 13.7563],
      zoom: 11,
    });

    mapRef.current = map;

    map.on('load', () => {
      if (!map.getSource(ROUTE_SOURCE_ID)) {
        map.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });
      }

      if (!map.getLayer(ROUTE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          paint: {
            'line-color': '#FF7A18',
            'line-width': 4,
            'line-opacity': 0.9,
          },
        });
      }

      if (!map.getSource(MAP_SOURCE_ID)) {
        map.addSource(MAP_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });
      }

      if (!map.getLayer(MAP_LAYER_ID)) {
        map.addLayer({
          id: MAP_LAYER_ID,
          type: 'circle',
          source: MAP_SOURCE_ID,
          paint: {
            'circle-radius': 7,
            'circle-color': ['coalesce', ['get', 'color'], '#007AFF'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          },
        });
      }

      if (!map.getLayer(MAP_LABEL_LAYER_ID)) {
        map.addLayer({
          id: MAP_LABEL_LAYER_ID,
          type: 'symbol',
          source: MAP_SOURCE_ID,
          layout: {
            'text-field': ['coalesce', ['get', 'label'], ''],
            'text-size': 11,
            'text-offset': [0, 1.4],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#1A1A2E',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
          },
        });
      }
    });

    map.on('click', (event) => {
      if (hasActiveTripRef.current) {
        return;
      }

      const coordinate = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };

      setDroppedPinLocation(coordinate);
      setSearchedLocation(null);

      reverseGeocode(coordinate)
        .then((address) => {
          setDroppedPinAddress(address);
        })
        .catch(() => {
          setDroppedPinAddress(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
        });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  // Trigger vibration when someone else activates SOS (not the person who pressed it)
  useEffect(() => {
    if (isSOSActive && sosActivatorName && sosActivatorId && sosActivatorId !== userProfile?.uid) {
      if (window.navigator?.vibrate) {
        // Vibrate strongly for 15-20 seconds (like incoming call): vibrate 1000ms, pause 500ms
        const pattern = [];
        for (let i = 0; i < 12; i++) { // 12 cycles = 18 seconds
          pattern.push(1000, 500);
        }
        window.navigator.vibrate(pattern);
      }
    }
  }, [isSOSActive, sosActivatorName, sosActivatorId, userProfile?.uid]);

  useEffect(() => {
    if (!mapRef.current || !activeLocation) {
      return;
    }

    mapRef.current.easeTo({
      center: [activeLocation.longitude, activeLocation.latitude],
      zoom: 15,
      duration: 700,
    });
  }, [activeLocation]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const pointsFeatures: any[] = [];

    const pushPoint = (
      id: string,
      coordinate: { latitude: number; longitude: number } | null,
      label: string,
      color: string,
    ) => {
      if (!coordinate) {
        return;
      }

      pointsFeatures.push({
        type: 'Feature',
        id,
        geometry: {
          type: 'Point',
          coordinates: [coordinate.longitude, coordinate.latitude],
        },
        properties: {
          label,
          color,
        },
      });
    };

    pushPoint('destination', destination, 'Destination', '#FF3B30');
    pushPoint('current-user', currentUserLocation, 'You', '#007AFF');
    pushPoint('search', searchedLocation, 'Search', '#34C759');
    pushPoint('dropped-pin', droppedPinLocation, 'Pin', '#FF9500');
    pushPoint('sos', isSOSActive ? sosActivatorLocation : null, 'SOS', '#D00000');

    members.forEach((member) => {
      if (!member.location) {
        return;
      }

      pointsFeatures.push({
        type: 'Feature',
        id: `member-${member.id}`,
        geometry: {
          type: 'Point',
          coordinates: [member.location.longitude, member.location.latitude],
        },
        properties: {
          label: member.id === userProfile?.uid ? 'You' : member.name,
          color: member.id === userProfile?.uid ? '#007AFF' : '#8A63D2',
        },
      });
    });

    const pointsCollection = {
      type: 'FeatureCollection',
      features: pointsFeatures,
    };

    const routeCollection = {
      type: 'FeatureCollection',
      features: routePoints.length > 1
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routePoints.map((point) => [point.longitude, point.latitude]),
              },
              properties: {},
            },
          ]
        : [],
    };

    const pointsSource = map.getSource(MAP_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    const routeSource = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

    pointsSource?.setData(pointsCollection as GeoJSON.FeatureCollection);
    routeSource?.setData(routeCollection as GeoJSON.FeatureCollection);
  }, [
    currentUserLocation,
    destination,
    droppedPinLocation,
    isSOSActive,
    members,
    routePoints,
    searchedLocation,
    sosActivatorLocation,
    userProfile?.uid,
  ]);

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
      setSearchedLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleOpenExternalMap = async () => {
    if (!activeLocation) {
      Alert.alert('No location selected', 'Search a place or enable location first.');
      return;
    }

    const url = `https://www.openstreetmap.org/?mlat=${activeLocation.latitude}&mlon=${activeLocation.longitude}#map=16/${activeLocation.latitude}/${activeLocation.longitude}`;
    await Linking.openURL(url);
  };

  const handleCreateTripFromSearch = () => {
    const location = droppedPinLocation || searchedLocation;
    const address = droppedPinAddress || searchText.trim();

    if (!location || hasActiveTrip) {
      return;
    }

    navigation.navigate('CreateTrip', {
      prefillDestination: location,
      prefillAddress: address,
    });
  };

  const handleStartJourney = () => {
    if (isInAppNavigation) {
      setIsInAppNavigation(false);
      Alert.alert('หยุดโหมดนำทาง', 'ปิดการติดตามเส้นทางแล้ว');
      return;
    }

    if (!destination) {
      Alert.alert('ยังไม่มีปลายทาง', 'กรุณาตั้งปลายทางของทริปก่อนเริ่มนำทาง');
      return;
    }

    if (!currentUserLocation) {
      Alert.alert('ยังไม่พบตำแหน่ง', 'กรุณารอสักครู่เพื่อรับตำแหน่งล่าสุดของคุณ');
      return;
    }

    setIsInAppNavigation(true);
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentUserLocation.latitude}%2C${currentUserLocation.longitude}%3B${destination.latitude}%2C${destination.longitude}`;
    Linking.openURL(url);
    Alert.alert('เปิดนำทาง', 'เปิด OpenStreetMap เพื่อนำทางไปยังปลายทาง');
  };

  const canCreateTripFromMap = !hasActiveTrip && Boolean(droppedPinLocation || searchedLocation);

  return (
    <SafeAreaView style={[styles.container, !hasActiveTrip && styles.noTripContainer]}>
      {hasActiveTrip && currentTripCode ? (
        <View style={styles.tripCodeBanner}>
          <Text style={styles.tripCodeLabel}>Join code: {currentTripCode}</Text>
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
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#DCE6F5',
          }}
        />

        <View style={styles.mapControls}>
          {isSOSActive && hasActiveTrip ? (
            <View style={[styles.searchBox, { backgroundColor: '#FF3B30', borderColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
                  🚨 {sosActivatorName} needs help!
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                  {sosActivatorLocation ? `${sosActivatorLocation.latitude.toFixed(5)}, ${sosActivatorLocation.longitude.toFixed(5)}` : 'Locating...'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  void triggerSOS(false);
                }}
                style={{ paddingLeft: 8 }}
              >
                <Text style={{ fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search destination..."
                returnKeyType="search"
                value={searchText}
                onSubmitEditing={handleSearch}
                onChangeText={setSearchText}
              />
              <TouchableOpacity
                style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
                onPress={handleSearch}
                disabled={isSearching}
              >
                <Text style={styles.searchButtonText}>{isSearching ? '...' : 'Search'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isSOSActive && (isSuggestionLoading || suggestions.length > 0) && !isSearching ? (
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
        </View>

        <View
          style={{
            position: 'absolute',
            right: 12,
            bottom: 64,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <TouchableOpacity
            style={[styles.locateButton, { marginTop: 0, alignSelf: 'auto' }, isLocating && styles.locateButtonDisabled]}
            onPress={() => {
              void handleLocateMe();
            }}
            disabled={isLocating}
          >
            {isLocating ? <ActivityIndicator size="small" color="#1A1A2E" /> : <Text style={styles.locateButtonIcon}>⌖</Text>}
          </TouchableOpacity>

          {canCreateTripFromMap ? (
            <TouchableOpacity
              style={[styles.locateButton, { marginTop: 0, alignSelf: 'auto' }]}
              onPress={handleCreateTripFromSearch}
            >
              <Text style={styles.locateButtonIcon}>➕</Text>
            </TouchableOpacity>
          ) : null}

          {activeLocation ? (
            <TouchableOpacity
              style={[styles.locateButton, { marginTop: 0, alignSelf: 'auto', backgroundColor: '#007AFF' }]}
              onPress={() => {
                void handleOpenExternalMap();
              }}
            >
              <Text style={[styles.locateButtonIcon, { color: '#fff' }]}>🗺️</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {hasActiveTrip && tripError ? <Text style={styles.errorText}>{tripError}</Text> : null}

      {hasActiveTrip ? (
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('MeetingPoint')}>
            <Text style={styles.navBtnText}>📍 Set Point</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sosBtn, isSOSActive && styles.sosBtnActive]}
            onPress={async () => {
              const newSOSState = !isSOSActive;
              await triggerSOS(newSOSState);
              
              // Trigger vibration for all members (web uses different vibration API)
              // Vibrate strongly for 15-20 seconds (like incoming call)
              if (newSOSState && window.navigator?.vibrate) {
                const pattern = [];
                for (let i = 0; i < 12; i++) { // 12 cycles = 18 seconds
                  pattern.push(1000, 500);
                }
                window.navigator.vibrate(pattern);
              }
            }}
          >
            <Text style={styles.sosBtnText}>{isSOSActive ? '✅ Cancel SOS' : '🚨 SOS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={handleStartJourney}>
            <Text style={styles.navBtnText}>{isInAppNavigation ? 'Stop' : 'Start'}</Text>
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

      {hasActiveTrip ? (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, backgroundColor: 'white' }}
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
          ListHeaderComponent={
            <View style={{ paddingTop: 10, paddingBottom: 8 }}>
              <Text style={styles.sectionTitle}>Members Status</Text>
              <Text style={styles.memberMode}>Destination: {destinationAddress || 'Not set yet'}</Text>
            </View>
          }
        />
      ) : null}
    </SafeAreaView>
  );
}