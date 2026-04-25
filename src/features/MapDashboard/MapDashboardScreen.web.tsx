import * as Location from 'expo-location';
import maplibregl from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './MapDashboard.styles';

const MAP_SOURCE_ID = 'trip-points-source';
const MAP_LAYER_ID = 'trip-points-layer';
const MAP_MEETING_HALO_LAYER_ID = 'trip-points-meeting-halo-layer';
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

const getDistanceMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number => {
  const toRad = (value: number) => value * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const [isMemberPanelExpanded, setIsMemberPanelExpanded] = useState(false);
  const [isCodeModalVisible, setIsCodeModalVisible] = useState(false);
  const [isSearchBoxExpanded, setIsSearchBoxExpanded] = useState(false);
  const [meetingRoutePoints, setMeetingRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isMeetingGuideActive, setIsMeetingGuideActive] = useState(false);
  const [dismissedMeetingAlertKey, setDismissedMeetingAlertKey] = useState<string | null>(null);
  const [sosRoutePoints, setSosRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasActiveTripRef = useRef(false);
  const autoNavigatedMeetingKeyRef = useRef<string | null>(null);
  const completedAlertShownRef = useRef(false);
  const manualFocusUntilRef = useRef(0);

  const userProfile = useAuthStore((state) => state.userProfile);
  const sosAlertsEnabled = useSettingsStore((state) => state.sosAlerts);
  const {
    currentTripCode,
    tripName,
    ownerId,
    members,
    destination,
    destinationAddress,
    meetingPoint,
    meetingPointAddress,
    meetingPointSetAtMs,
    meetingPointSetterId,
    meetingPointSetterName,
    meetingReachedBy,
    destinationReachedBy,
    isTripCompleted,
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
    markMeetingReached,
    markDestinationReached,
    completeTrip,
    leaveTrip,
  } = useTripStore();

  const hasActiveTrip = Boolean(currentTripCode);
  const currentUid = userProfile?.uid ?? null;
  const meetingKey = `${meetingPointSetterId ?? 'none'}-${meetingPointSetAtMs ?? 0}`;
  const isCurrentUserMeetingSetter = Boolean(currentUid && meetingPointSetterId && currentUid === meetingPointSetterId);
  const hasReachedMeeting = Boolean(currentUid && meetingReachedBy[currentUid]);
  const hasReachedDestination = Boolean(currentUid && destinationReachedBy[currentUid]);
  const showMeetingMarker = Boolean(meetingPoint && !hasReachedMeeting);
  const showMeetingNotification = Boolean(
    hasActiveTrip
      && meetingPoint
      && !hasReachedMeeting
      && !isCurrentUserMeetingSetter
      && dismissedMeetingAlertKey !== meetingKey,
  );

  useEffect(() => {
    hasActiveTripRef.current = hasActiveTrip;
  }, [hasActiveTrip]);

  useEffect(() => {
    if (!meetingPoint) {
      setIsMeetingGuideActive(false);
      setDismissedMeetingAlertKey(null);
      autoNavigatedMeetingKeyRef.current = null;
      return;
    }

    if (hasReachedMeeting) {
      setIsMeetingGuideActive(false);
      return;
    }

    if (isCurrentUserMeetingSetter && autoNavigatedMeetingKeyRef.current !== meetingKey) {
      autoNavigatedMeetingKeyRef.current = meetingKey;
      setIsMeetingGuideActive(true);

      if (currentUserLocation) {
        const navUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentUserLocation.latitude}%2C${currentUserLocation.longitude}%3B${meetingPoint.latitude}%2C${meetingPoint.longitude}`;
        void Linking.openURL(navUrl);
      }
    }
  }, [
    currentUserLocation,
    hasReachedMeeting,
    isCurrentUserMeetingSetter,
    meetingKey,
    meetingPoint,
  ]);

  const activeLocation = useMemo(() => {
    if (hasActiveTrip && currentUserLocation) {
      return currentUserLocation;
    }

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
  }, [currentUserLocation, destination, searchedLocation, droppedPinLocation, hasActiveTrip]);

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
          id: MAP_MEETING_HALO_LAYER_ID,
          type: 'circle',
          source: MAP_SOURCE_ID,
          filter: ['==', ['coalesce', ['get', 'isMeeting'], 0], 1],
          paint: {
            'circle-radius': 24,
            'circle-color': '#F6C80A',
            'circle-opacity': 0.24,
          },
        });

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
    if (!sosAlertsEnabled) {
      return;
    }

    if (!isSOSActive && window.navigator?.vibrate) {
      window.navigator.vibrate(0);
    }

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

    return () => {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(0);
      }
    };
  }, [isSOSActive, sosAlertsEnabled, sosActivatorName, sosActivatorId, userProfile?.uid]);

  useEffect(() => {
    if (!mapRef.current || !activeLocation) {
      return;
    }

    if (hasActiveTrip && Date.now() < manualFocusUntilRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: [activeLocation.longitude, activeLocation.latitude],
      zoom: 15,
      duration: 700,
    });
  }, [activeLocation, hasActiveTrip]);

  useEffect(() => {
    if (!meetingPoint || !currentUserLocation || hasReachedMeeting) {
      setMeetingRoutePoints([]);
      return;
    }

    let isCancelled = false;

    getDirectionsRoute(currentUserLocation, meetingPoint)
      .then((points) => {
        if (!isCancelled) {
          setMeetingRoutePoints(points);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setMeetingRoutePoints([currentUserLocation, meetingPoint]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUserLocation, hasReachedMeeting, meetingPoint]);

  useEffect(() => {
    if (!isSOSActive || !sosActivatorLocation || !currentUserLocation || sosActivatorId === currentUid) {
      setSosRoutePoints([]);
      return;
    }

    let isCancelled = false;

    getDirectionsRoute(currentUserLocation, sosActivatorLocation)
      .then((points) => {
        if (!isCancelled) {
          setSosRoutePoints(points.length > 1 ? points : [currentUserLocation, sosActivatorLocation]);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSosRoutePoints([currentUserLocation, sosActivatorLocation]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUid, currentUserLocation, isSOSActive, sosActivatorId, sosActivatorLocation]);

  useEffect(() => {
    if (!currentUid || !meetingPoint || !currentUserLocation || hasReachedMeeting) {
      return;
    }

    const distanceMeters = getDistanceMeters(currentUserLocation, meetingPoint);

    if (distanceMeters <= 40) {
      void markMeetingReached();
      setIsMeetingGuideActive(false);
      setDismissedMeetingAlertKey(meetingKey);
    }
  }, [
    currentUid,
    currentUserLocation,
    hasReachedMeeting,
    markMeetingReached,
    meetingKey,
    meetingPoint,
  ]);

  useEffect(() => {
    if (!currentUid || !destination || !currentUserLocation || hasReachedDestination) {
      return;
    }

    const distanceMeters = getDistanceMeters(currentUserLocation, destination);

    if (distanceMeters <= 50) {
      void markDestinationReached();
    }
  }, [
    currentUid,
    currentUserLocation,
    destination,
    hasReachedDestination,
    markDestinationReached,
  ]);

  useEffect(() => {
    if (!currentUid || !ownerId || currentUid !== ownerId || isTripCompleted || members.length === 0) {
      return;
    }

    const everyoneReachedDestination = members.every((member) => destinationReachedBy[member.id]);

    if (everyoneReachedDestination) {
      void completeTrip();
    }
  }, [
    completeTrip,
    currentUid,
    destinationReachedBy,
    isTripCompleted,
    members,
    ownerId,
  ]);

  useEffect(() => {
    if (!isTripCompleted || completedAlertShownRef.current) {
      return;
    }

    completedAlertShownRef.current = true;

    Alert.alert('Trip Completed', 'ทุกคนถึงปลายทางแล้ว ระบบจะจบทริปให้อัตโนมัติ', [
      {
        text: 'OK',
        onPress: () => {
          void leaveTrip().finally(() => {
            navigation.navigate('Home');
          });
        },
      },
    ]);
  }, [isTripCompleted, leaveTrip, navigation]);

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
      isMeeting = false,
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
          isMeeting: isMeeting ? 1 : 0,
        },
      });
    };

    pushPoint('destination', destination, 'Destination', '#007AFF');
    pushPoint('current-user', currentUserLocation, 'You', '#007AFF');
    pushPoint('search', searchedLocation, 'Search', '#34C759');
    pushPoint('dropped-pin', droppedPinLocation, 'Pin', '#FF9500');
    pushPoint('sos', isSOSActive ? sosActivatorLocation : null, 'SOS', '#D00000');
    pushPoint('meeting-point', showMeetingMarker ? meetingPoint : null, 'Meeting Point', '#F6C80A', true);

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
          color: member.id === userProfile?.uid ? '#007AFF' : '#34C759',
        },
      });
    });

    const pointsCollection = {
      type: 'FeatureCollection',
      features: pointsFeatures,
    };

    const activeRoutePoints = isSOSActive && sosActivatorLocation && currentUserLocation && sosActivatorId !== currentUid
      ? sosRoutePoints
      : showMeetingMarker && meetingPoint && currentUserLocation
      ? meetingRoutePoints
      : routePoints;

    const routeCollection = {
      type: 'FeatureCollection',
      features: activeRoutePoints.length > 1
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: activeRoutePoints.map((point) => [point.longitude, point.latitude]),
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

    if (map.getLayer(ROUTE_LAYER_ID)) {
      map.setPaintProperty(
        ROUTE_LAYER_ID,
        'line-color',
        isSOSActive && sosActivatorLocation && sosActivatorId !== currentUid
          ? '#D00000'
          : showMeetingMarker
            ? '#F6C80A'
            : '#007AFF',
      );
    }
  }, [
    currentUid,
    currentUserLocation,
    meetingPoint,
    destination,
    droppedPinLocation,
    isSOSActive,
    members,
    meetingRoutePoints,
    routePoints,
    searchedLocation,
    showMeetingMarker,
    sosActivatorId,
    sosActivatorLocation,
    sosRoutePoints,
    userProfile?.uid,
  ]);

  const handleTapMeetingAlert = () => {
    if (!meetingPoint) {
      return;
    }

    setIsMeetingGuideActive(true);
    setDismissedMeetingAlertKey(meetingKey);

    mapRef.current?.easeTo({
      center: [meetingPoint.longitude, meetingPoint.latitude],
      zoom: 15,
      duration: 600,
    });
  };

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
      manualFocusUntilRef.current = 0;
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
    manualFocusUntilRef.current = 0;
    mapRef.current?.easeTo({
      center: [currentUserLocation.longitude, currentUserLocation.latitude],
      zoom: 16,
      duration: 500,
    });
    Alert.alert('เริ่มโหมดนำทาง', 'แผนที่จะติดตามตำแหน่งของคุณในหน้าปัจจุบัน');
  };

  const handleFocusMember = (member: (typeof members)[number]) => {
    if (!member.location || !mapRef.current) {
      return;
    }

    // Pause self-follow briefly so the selected member stays in focus.
    manualFocusUntilRef.current = Date.now() + 10000;

    mapRef.current.easeTo({
      center: [member.location.longitude, member.location.latitude],
      zoom: 16,
      duration: 500,
    });
  };

  const canCreateTripFromMap = !hasActiveTrip && Boolean(droppedPinLocation || searchedLocation);
  const isTripOwner = Boolean(currentUid && ownerId && currentUid === ownerId);

  const handleMeetingPointButtonPress = async () => {
    if (!hasActiveTrip) {
      return;
    }

    if (!isTripOwner) {
      Alert.alert('ไม่มีสิทธิ์', 'เฉพาะคนสร้างทริปเท่านั้นที่จัดการ Meeting Point ได้');
      return;
    }

    if (meetingPoint) {
      try {
        await useTripStore.getState().clearMeetingPoint();
        setIsMeetingGuideActive(false);
        Alert.alert('ยกเลิกแล้ว', 'ลบจุดนัดหมายเรียบร้อย');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถยกเลิกจุดนัดหมายได้';
        Alert.alert('ผิดพลาด', message);
      }
      return;
    }

    navigation.navigate('MeetingPoint');
  };

  return (
    <SafeAreaView style={[styles.container, !hasActiveTrip && styles.noTripContainer]}>
      {hasActiveTrip ? (
        <View style={styles.header}>
          <View>
            <Text style={styles.tripName}>{tripName || 'Trip Map'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.codeButton}
              onPress={() => setIsCodeModalVisible(!isCodeModalVisible)}
            >
              <Text style={styles.codeButtonText}>Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
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
          {showMeetingNotification ? (
            <TouchableOpacity style={styles.meetingAlertBanner} onPress={handleTapMeetingAlert}>
              <Text style={styles.meetingAlertTitle}>⚠️ มีการปักหมุดจุดนัดหมายแล้ว</Text>
              <Text style={styles.meetingAlertSubtitle}>
                {meetingPointSetterName ? `${meetingPointSetterName} ปักหมุดไว้` : 'สมาชิกในทริปปักหมุดไว้'}
                {meetingPointAddress ? ` • ${meetingPointAddress}` : ''}
              </Text>
            </TouchableOpacity>
          ) : null}

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
          ) : isSearchBoxExpanded ? (
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search destination..."
                placeholderTextColor="#E5E7EB"
                returnKeyType="search"
                autoFocus
                value={searchText}
                onSubmitEditing={handleSearch}
                onChangeText={setSearchText}
              />
              <TouchableOpacity
                style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
                onPress={handleSearch}
                disabled={isSearching}
              >
                <Text style={styles.searchButtonText}>{isSearching ? '...' : '🔍'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsSearchBoxExpanded(false)}
                style={{ paddingLeft: 8 }}
              >
                <Text style={{ fontSize: 18, color: '#1A1A2E' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.searchIconButton}
              onPress={() => setIsSearchBoxExpanded(true)}
            >
              <Text style={{ fontSize: 18, color: '#FFFFFF' }}>🔍</Text>
            </TouchableOpacity>
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
          <TouchableOpacity
            style={[styles.navBtn, !isTripOwner && { opacity: 0.6 }]}
            onPress={() => {
              void handleMeetingPointButtonPress();
            }}
          >
            <Text style={styles.navBtnText}>{meetingPoint ? 'Cancel' : '📍 Set Point'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sosBtn, isSOSActive && styles.sosBtnActive]}
            onPress={async () => {
              const newSOSState = !isSOSActive;
              await triggerSOS(newSOSState);

              if (!newSOSState && window.navigator?.vibrate) {
                window.navigator.vibrate(0);
              }
            }}
          >
            <Text style={styles.sosBtnText}>{isSOSActive ? '✅ Cancel SOS' : '🚨 SOS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navBtn, { backgroundColor: '#D9534F' }]} 
            onPress={async () => {
              try {
                await useTripStore.getState().leaveTrip();
                navigation.navigate('Home');
              } catch {
                Alert.alert('Error', 'Failed to leave trip');
              }
            }}
          >
            <Text style={[styles.navBtnText, { color: 'white' }]}>Leave Trip</Text>
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
        <View style={styles.memberSheet}>
          <TouchableOpacity
            style={styles.memberSheetHeader}
            onPress={() => {
              setIsMemberPanelExpanded((prev) => !prev);
            }}
          >
            <View>
              <Text style={styles.memberSheetTitle}>Members ({members.length})</Text>
              <Text style={styles.memberSheetHint}>Mode: {locationMode.toUpperCase()} • Destination: {destinationAddress || 'Not set yet'}</Text>
            </View>
            <Text style={styles.memberSheetArrow}>{isMemberPanelExpanded ? '▾' : '▸'}</Text>
          </TouchableOpacity>

          {isMemberPanelExpanded ? (
            <FlatList
              style={styles.memberSheetList}
              data={members}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memberSheetListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberRow}
                  onPress={() => {
                    handleFocusMember(item);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.memberAvatar}>👤</Text>
                  <View style={styles.memberMeta}>
                    <Text style={styles.memberName}>{item.id === userProfile?.uid ? `${item.name} (You)` : item.name}</Text>
                    <Text style={styles.memberMode}>{item.locationMode.toUpperCase()} • {item.location ? 'Online' : 'Waiting GPS'}</Text>
                  </View>
                  <Text style={item.batteryLevel < 20 ? styles.lowBattery : styles.battery}>🔋 {item.batteryLevel}%</Text>
                </TouchableOpacity>
              )}
            />
          ) : null}
        </View>
      ) : null}

      {/* Code Modal */}
      {isCodeModalVisible && hasActiveTrip ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join Code</Text>
              <TouchableOpacity
                onPress={() => setIsCodeModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.codeDisplay}>{currentTripCode || 'N/A'}</Text>
              <Text style={styles.codeText}>Share this code with others to join the trip</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsCodeModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}