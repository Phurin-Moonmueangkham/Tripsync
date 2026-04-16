import * as Location from 'expo-location';
import maplibregl from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import BottomNavigationBar from '../../components/BottomNavigationBar';
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const personMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const hasActiveTripRef = useRef(false);
  const autoNavigatedMeetingKeyRef = useRef<string | null>(null);
  const completedAlertShownRef = useRef(false);
  const lastSosZoomKeyRef = useRef<string | null>(null);

  const userProfile = useAuthStore((state) => state.userProfile);
  const sosAlertsEnabled = useSettingsStore((state) => state.sosAlerts);
  const proximityAlertsEnabled = useSettingsStore((state) => state.proximityAlerts);
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
  const defaultTripRoutePoints = useMemo(() => {
    if (routePoints.length > 1) {
      return routePoints;
    }

    if (currentUserLocation && destination) {
      return [currentUserLocation, destination];
    }

    return routePoints;
  }, [currentUserLocation, destination, routePoints]);

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
    if (!isSOSActive || !sosActivatorLocation || !sosActivatorId) {
      lastSosZoomKeyRef.current = null;
      return;
    }

    const sosKey = `${sosActivatorId}-${Math.round(sosActivatorLocation.latitude * 10000)}-${Math.round(sosActivatorLocation.longitude * 10000)}`;
    if (lastSosZoomKeyRef.current === sosKey) {
      return;
    }

    lastSosZoomKeyRef.current = sosKey;
    mapRef.current?.easeTo({
      center: [sosActivatorLocation.longitude, sosActivatorLocation.latitude],
      zoom: 16,
      duration: 650,
    });
  }, [isSOSActive, sosActivatorId, sosActivatorLocation]);

  useEffect(() => {
    if (!hasActiveTrip) {
      void stopLocationTracking();
      return;
    }

    void startLocationTracking();

    return () => {
      void stopLocationTracking();
    };
  }, [currentTripCode, hasActiveTrip, locationMode, startLocationTracking, stopLocationTracking]);

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
            'line-color': '#007AFF',
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
          filter: ['!=', ['coalesce', ['get', 'isPerson'], 0], 1],
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
          filter: ['!=', ['coalesce', ['get', 'isPerson'], 0], 1],
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
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded() || !hasActiveTrip) {
      Object.values(personMarkersRef.current).forEach((marker) => marker.remove());
      personMarkersRef.current = {};
      return;
    }

    const points: Array<{ id: string; latitude: number; longitude: number; color: string; title: string }> = [];

    if (currentUserLocation) {
      const isCurrentUserSos = isSOSActive && sosActivatorId === currentUid;
      points.push({
        id: 'current-user',
        latitude: currentUserLocation.latitude,
        longitude: currentUserLocation.longitude,
        color: isCurrentUserSos ? '#FF3B30' : '#22C55E',
        title: 'You',
      });
    }

    members.forEach((member) => {
      if (!member.location || member.id === userProfile?.uid) {
        return;
      }

      points.push({
        id: `member-${member.id}`,
        latitude: member.location.latitude,
        longitude: member.location.longitude,
        color: isSOSActive && member.id === sosActivatorId ? '#FF3B30' : '#22C55E',
        title: member.name,
      });
    });

    const nextIds = new Set(points.map((point) => point.id));

    Object.entries(personMarkersRef.current).forEach(([id, marker]) => {
      if (!nextIds.has(id)) {
        marker.remove();
        delete personMarkersRef.current[id];
      }
    });

    points.forEach((point) => {
      const existingMarker = personMarkersRef.current[point.id];
      if (existingMarker) {
        existingMarker.setLngLat([point.longitude, point.latitude]);
        return;
      }

      const markerElement = document.createElement('div');
      markerElement.title = point.title;
      markerElement.style.width = '34px';
      markerElement.style.height = '46px';
      markerElement.style.display = 'flex';
      markerElement.style.flexDirection = 'column';
      markerElement.style.alignItems = 'center';
      markerElement.style.justifyContent = 'flex-start';

      const pinHead = document.createElement('div');
      pinHead.style.width = '24px';
      pinHead.style.height = '24px';
      pinHead.style.borderRadius = '12px';
      pinHead.style.backgroundColor = point.color;
      pinHead.style.border = '2px solid #FFFFFF';
      pinHead.style.display = 'flex';
      pinHead.style.alignItems = 'center';
      pinHead.style.justifyContent = 'center';

      const innerDot = document.createElement('div');
      innerDot.style.width = '8px';
      innerDot.style.height = '8px';
      innerDot.style.borderRadius = '4px';
      innerDot.style.backgroundColor = '#FFFFFF';
      pinHead.appendChild(innerDot);

      const pinTail = document.createElement('div');
      pinTail.style.width = '0';
      pinTail.style.height = '0';
      pinTail.style.borderLeft = '6px solid transparent';
      pinTail.style.borderRight = '6px solid transparent';
      pinTail.style.borderTop = `10px solid ${point.color}`;
      pinTail.style.marginTop = '-2px';

      markerElement.appendChild(pinHead);
      markerElement.appendChild(pinTail);

      const marker = new maplibregl.Marker({ element: markerElement, anchor: 'center' })
        .setLngLat([point.longitude, point.latitude])
        .addTo(map);

      personMarkersRef.current[point.id] = marker;
    });
  }, [currentUid, currentUserLocation, hasActiveTrip, isSOSActive, members, sosActivatorId, userProfile?.uid]);

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
  }, [isSOSActive, sosActivatorName, sosActivatorId, sosAlertsEnabled, userProfile?.uid]);

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
    if (!meetingPoint || !currentUserLocation || hasReachedMeeting || !isMeetingGuideActive) {
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
  }, [currentUserLocation, hasReachedMeeting, isMeetingGuideActive, meetingPoint]);

  useEffect(() => {
    if (!currentUid || !meetingPoint || !currentUserLocation || hasReachedMeeting) {
      return;
    }

    const distanceMeters = getDistanceMeters(currentUserLocation, meetingPoint);

    if (distanceMeters <= 40) {
      if (proximityAlertsEnabled) {
        Alert.alert('ถึง Meeting Point แล้ว', 'ระบบจะบันทึกว่าคุณมาถึงจุดนัดพบแล้ว');
      }

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
    proximityAlertsEnabled,
  ]);

  useEffect(() => {
    if (!currentUid || !destination || !currentUserLocation || hasReachedDestination) {
      return;
    }

    const distanceMeters = getDistanceMeters(currentUserLocation, destination);

    if (distanceMeters <= 50) {
      if (proximityAlertsEnabled) {
        Alert.alert('ถึงปลายทางแล้ว', 'ระบบจะบันทึกว่าคุณมาถึงปลายทางแล้ว');
      }

      void markDestinationReached();
    }
  }, [
    currentUid,
    currentUserLocation,
    destination,
    hasReachedDestination,
    markDestinationReached,
    proximityAlertsEnabled,
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
    pushPoint('search', searchedLocation, 'Search', '#34C759');
    pushPoint('dropped-pin', droppedPinLocation, 'Pin', '#FF9500');
    pushPoint('sos', isSOSActive ? sosActivatorLocation : null, 'SOS', '#D00000');
    pushPoint('meeting-point', showMeetingMarker ? meetingPoint : null, 'Meeting Point', '#F6C80A', true);

    const pointsCollection = {
      type: 'FeatureCollection',
      features: pointsFeatures,
    };

    const activeRoutePoints = showMeetingMarker && meetingPoint && currentUserLocation && isMeetingGuideActive
      ? meetingRoutePoints
      : defaultTripRoutePoints;

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
        showMeetingMarker && isMeetingGuideActive ? '#F6C80A' : '#007AFF',
      );
    }
  }, [
    currentUserLocation,
    meetingPoint,
    destination,
    droppedPinLocation,
    isSOSActive,
    meetingRoutePoints,
    isMeetingGuideActive,
    defaultTripRoutePoints,
    searchedLocation,
    showMeetingMarker,
    sosActivatorLocation,
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

  const handleFocusMember = (member: { location: { latitude: number; longitude: number } | null }) => {
    if (!member.location) {
      return;
    }

    mapRef.current?.easeTo({
      center: [member.location.longitude, member.location.latitude],
      zoom: 16,
      duration: 550,
    });
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
        <BottomNavigationBar navigation={navigation} activeRoute="MapDashboard" />
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