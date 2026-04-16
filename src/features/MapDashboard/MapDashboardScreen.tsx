import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native';
import MapView, { MapPressEvent, Marker, Polyline, Circle } from 'react-native-maps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';
import { useSettingsStore } from '../../core/store/useSettingsStore';
import BottomNavigationBar from '../../components/BottomNavigationBar';
import { MEMBER_PANEL_HANDLE_HEIGHT, MEMBER_PANEL_HEIGHT, toHeading } from './MapDashboard.helpers';
import { styles } from './MapDashboard.styles';

export default function MapDashboardScreen({ navigation }: any) {
  const mapRef = useRef<MapView>(null);
  const lastManualCameraChangeAt = useRef(0);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinLocation, setDroppedPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinAddress, setDroppedPinAddress] = useState('');
  const [isMemberPanelExpanded, setIsMemberPanelExpanded] = useState(false);
  const [isInAppNavigation, setIsInAppNavigation] = useState(false);
  const [meetingRoutePoints, setMeetingRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isMeetingGuideActive, setIsMeetingGuideActive] = useState(false);
  const [dismissedMeetingAlertKey, setDismissedMeetingAlertKey] = useState<string | null>(null);
  const memberPanelTranslateY = useRef(new Animated.Value(MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT)).current;
  const lastNavigationLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastSosZoomKeyRef = useRef<string | null>(null);
  const previousTripCodeRef = useRef<string | null>(null);

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
    routePoints,
    isSOSActive,
    sosActivatorId,
    sosActivatorName,
    sosActivatorLocation,
    currentUserLocation,
    locationMode,
    tripError,
    triggerSOS,
    clearMeetingPoint,
    markMeetingReached,
    startLocationTracking,
    stopLocationTracking,
  } = useTripStore();

  const hasActiveTrip = Boolean(currentTripCode);
  const currentUid = userProfile?.uid ?? null;
  const meetingKey = `${meetingPointSetterId ?? 'none'}-${meetingPointSetAtMs ?? 0}`;
  const isCurrentUserMeetingSetter = Boolean(currentUid && meetingPointSetterId && currentUid === meetingPointSetterId);
  const hasReachedMeeting = Boolean(currentUid && meetingReachedBy[currentUid]);
  const showMeetingMarker = Boolean(meetingPoint && !hasReachedMeeting);
  const showMeetingNotification = Boolean(
    hasActiveTrip
      && meetingPoint
      && !hasReachedMeeting
      && !isCurrentUserMeetingSetter
      && dismissedMeetingAlertKey !== meetingKey,
  );
  const isTripOwner = Boolean(currentUid && ownerId && currentUid === ownerId);
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
    if (!hasActiveTrip) {
      setIsMemberPanelExpanded(false);
      setIsInAppNavigation(false);
      setIsMeetingGuideActive(false);
      setMeetingRoutePoints([]);
      setDismissedMeetingAlertKey(null);
      memberPanelTranslateY.setValue(MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT);
      lastNavigationLocationRef.current = null;
      lastSosZoomKeyRef.current = null;
    }
  }, [hasActiveTrip, memberPanelTranslateY]);

  useEffect(() => {
    if (!hasActiveTrip) {
      previousTripCodeRef.current = null;
      return;
    }

    if (previousTripCodeRef.current !== currentTripCode) {
      previousTripCodeRef.current = currentTripCode;
      setIsInAppNavigation(true);
    }
  }, [currentTripCode, hasActiveTrip]);

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    if (!isSOSActive || !sosActivatorLocation || !sosActivatorId) {
      lastSosZoomKeyRef.current = null;
      return;
    }

    const sosKey = `${sosActivatorId}-${Math.round(sosActivatorLocation.latitude * 10000)}-${Math.round(sosActivatorLocation.longitude * 10000)}`;
    if (lastSosZoomKeyRef.current === sosKey) {
      return;
    }

    lastSosZoomKeyRef.current = sosKey;
    lastManualCameraChangeAt.current = Date.now();
    mapRef.current?.animateToRegion(
      {
        ...sosActivatorLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      600,
    );
  }, [isMapReady, isSOSActive, sosActivatorId, sosActivatorLocation]);

  useEffect(() => {
    if (!meetingPoint) {
      setIsMeetingGuideActive(false);
      setMeetingRoutePoints([]);
      setDismissedMeetingAlertKey(null);
      return;
    }

    if (hasReachedMeeting) {
      setIsMeetingGuideActive(false);
      return;
    }

    if (isCurrentUserMeetingSetter) {
      setIsMeetingGuideActive(true);
    }
  }, [hasReachedMeeting, isCurrentUserMeetingSetter, meetingPoint]);

  // Trigger vibration when someone else activates SOS (not the person who pressed it)
  useEffect(() => {
    if (!sosAlertsEnabled) {
      return;
    }

    if (isSOSActive && sosActivatorName && sosActivatorId && sosActivatorId !== userProfile?.uid) {
      try {
        // Vibrate strongly for 15-20 seconds (like incoming call)
        for (let i = 0; i < 20; i++) { // 20 heavy impacts over ~16 seconds
          setTimeout(() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, i * 800);
        }
      } catch {
        // Vibration not available
      }
    }
  }, [isSOSActive, sosActivatorName, sosActivatorId, sosAlertsEnabled, userProfile?.uid]);

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
    if (!isMapReady) {
      return;
    }

    if (!hasActiveTrip) {
      return;
    }

    if (isInAppNavigation) {
      return;
    }

    if (Date.now() - lastManualCameraChangeAt.current < 3500) {
      return;
    }

    const activeRoutePoints = showMeetingMarker && isMeetingGuideActive && meetingRoutePoints.length > 1
      ? meetingRoutePoints
      : defaultTripRoutePoints;

    const points = [
      ...activeRoutePoints,
      ...members.map((member) => member.location).filter((location) => location !== null),
      ...(destination ? [destination] : []),
      ...(showMeetingMarker && meetingPoint ? [meetingPoint] : []),
    ];

    if (points.length < 2) {
      return;
    }

    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 80, right: 50, bottom: 80, left: 50 },
      animated: true,
    });
  }, [defaultTripRoutePoints, destination, hasActiveTrip, isInAppNavigation, isMapReady, isMeetingGuideActive, meetingPoint, meetingRoutePoints, members, showMeetingMarker]);

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    if (!hasActiveTrip || !isInAppNavigation || !currentUserLocation) {
      return;
    }

    const previousLocation = lastNavigationLocationRef.current;
    const heading = previousLocation
      ? toHeading(previousLocation, currentUserLocation)
      : showMeetingMarker && meetingPoint
        ? toHeading(currentUserLocation, meetingPoint)
        : destination
          ? toHeading(currentUserLocation, destination)
        : 0;

    mapRef.current?.animateCamera(
      {
        center: currentUserLocation,
        heading,
        pitch: 52,
        zoom: 17,
      },
      { duration: 700 },
    );

    lastNavigationLocationRef.current = currentUserLocation;
  }, [currentUserLocation, destination, hasActiveTrip, isInAppNavigation, isMapReady, meetingPoint, showMeetingMarker]);

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

    const toRad = (value: number) => value * Math.PI / 180;
    const earthRadius = 6371000;
    const dLat = toRad(meetingPoint.latitude - currentUserLocation.latitude);
    const dLng = toRad(meetingPoint.longitude - currentUserLocation.longitude);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(currentUserLocation.latitude))
      * Math.cos(toRad(meetingPoint.latitude))
      * Math.sin(dLng / 2) ** 2;
    const distanceMeters = 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distanceMeters <= 40) {
      if (proximityAlertsEnabled) {
        Alert.alert('ถึง Meeting Point แล้ว', 'ระบบจะบันทึกว่าคุณมาถึงจุดนัดพบแล้ว');
      }

      void markMeetingReached();
      setIsMeetingGuideActive(false);
      setDismissedMeetingAlertKey(meetingKey);
    }
  }, [currentUid, currentUserLocation, hasReachedMeeting, markMeetingReached, meetingKey, meetingPoint, proximityAlertsEnabled]);

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
      if (isMapReady) {
        mapRef.current?.animateToRegion(
          {
            ...place.location,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          600,
        );
      }
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

      if (isMapReady) {
        mapRef.current?.animateToRegion(
          {
            ...latestLocation,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          600,
        );
      }
    } finally {
      setIsLocating(false);
    }
  };

  const promptCreateTripFromLocation = (location: { latitude: number; longitude: number }, address?: string) => {
    Alert.alert(
      'Confirm create trip',
      'Do you want to create a trip with this destination?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Create',
          onPress: () => {
            navigation.navigate('CreateTrip', {
              prefillDestination: location,
              prefillAddress: address ?? '',
            });
          },
        },
      ],
    );
  };

  const handleMapPress = async (event: MapPressEvent) => {
    if (hasActiveTrip) {
      return;
    }

    const coordinate = event.nativeEvent.coordinate;
    setDroppedPinLocation(coordinate);

    try {
      const address = await reverseGeocode(coordinate);
      setDroppedPinAddress(address);
    } catch {
      setDroppedPinAddress(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
    }
  };

  const toggleMemberPanel = () => {
    const isExpanding = !isMemberPanelExpanded;
    setIsMemberPanelExpanded(isExpanding);

    Animated.timing(memberPanelTranslateY, {
      toValue: isExpanding ? 0 : MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const handleStartJourney = () => {
    if (isInAppNavigation) {
      setIsInAppNavigation(false);
      lastNavigationLocationRef.current = null;
      Alert.alert('หยุดโหมดนำทาง', 'ปิดการติดตามเส้นทางแล้ว');
      return;
    }

    if (!destination && !meetingPoint) {
      Alert.alert('ยังไม่มีปลายทาง', 'กรุณาตั้งปลายทางของทริปหรือ Meeting Point ก่อนเริ่มนำทาง');
      return;
    }

    if (!currentUserLocation) {
      Alert.alert('ยังไม่พบตำแหน่ง', 'กรุณารอสักครู่เพื่อรับตำแหน่งล่าสุดของคุณ');
      return;
    }

    lastNavigationLocationRef.current = currentUserLocation;
    setIsInAppNavigation(true);
    Alert.alert('เริ่มโหมดนำทาง', 'แผนที่จะติดตามตำแหน่งและหันตามทิศทางการเดินทางของคุณ');
  };

  const handleTapMeetingAlert = () => {
    if (!meetingPoint) {
      return;
    }

    setIsMeetingGuideActive(true);
    setDismissedMeetingAlertKey(meetingKey);
    lastManualCameraChangeAt.current = Date.now();
    if (isMapReady) {
      mapRef.current?.animateToRegion(
        {
          ...meetingPoint,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    }
  };

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
        await clearMeetingPoint();
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

  const handleFocusMember = (member: { id: string; name: string; location: { latitude: number; longitude: number } | null }) => {
    if (!member.location || !isMapReady) {
      return;
    }

    lastManualCameraChangeAt.current = Date.now();
    mapRef.current?.animateToRegion(
      {
        ...member.location,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      550,
    );
  };

  return (
    <SafeAreaView style={[styles.container, !hasActiveTrip && styles.noTripContainer]}>
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
          showsUserLocation={false}
          onMapReady={() => {
            setIsMapReady(true);
          }}
          onPress={(event) => {
            void handleMapPress(event);
          }}
        >
          {destination ? <Marker coordinate={destination} title="Destination" description={destinationAddress} pinColor="#007AFF" /> : null}

          {(showMeetingMarker && isMeetingGuideActive ? meetingRoutePoints : defaultTripRoutePoints).length > 1 ? (
            <Polyline
              coordinates={showMeetingMarker && isMeetingGuideActive ? meetingRoutePoints : defaultTripRoutePoints}
              strokeColor={showMeetingMarker && isMeetingGuideActive ? '#F6C80A' : '#007AFF'}
              strokeWidth={4}
            />
          ) : null}

          {showMeetingMarker && meetingPoint ? (
            <>
              <Circle
                center={meetingPoint}
                radius={160}
                strokeColor="rgba(246, 200, 10, 0.65)"
                strokeWidth={2}
                fillColor="rgba(246, 200, 10, 0.18)"
              />
              <Circle
                center={meetingPoint}
                radius={90}
                strokeColor="rgba(246, 200, 10, 0.95)"
                strokeWidth={2}
                fillColor="rgba(246, 200, 10, 0.30)"
              />
              <Marker
                coordinate={meetingPoint}
                title="Meeting Point"
                description={meetingPointAddress || 'จุดรวมพลของทริป'}
                pinColor="#F6C80A"
              />
            </>
          ) : null}

          {searchedLocation ? (
            <Marker
              coordinate={searchedLocation}
              title="Search Result"
              description="Tap marker to create a trip"
              pinColor="#007AFF"
              onPress={() => {
                if (hasActiveTrip) {
                  return;
                }

                const fallbackAddress = searchText.trim();
                promptCreateTripFromLocation(searchedLocation, fallbackAddress);
              }}
            />
          ) : null}

          {droppedPinLocation && !hasActiveTrip ? (
            <Marker
              coordinate={droppedPinLocation}
              title="Pinned Destination"
              description="Tap marker to create a trip"
              pinColor="#FF2D55"
              onPress={() => {
                promptCreateTripFromLocation(droppedPinLocation, droppedPinAddress);
              }}
            />
          ) : null}

          {members
            .filter((member) => member.location)
            .map((member) => {
              const isCurrentUser = member.id === userProfile?.uid;
              const isSOSActivator = isSOSActive && member.id === sosActivatorId;

              // ทุกคนสีเขียว และคนกด SOS จะเป็นสีแดง
              let pinColor = '#22C55E';
              let titleSuffix = '';

              if (isSOSActivator) {
                pinColor = '#FF3B30';
              }

              if (isCurrentUser && !titleSuffix) {
                titleSuffix = ' (You)';
              }

              return (
                <React.Fragment key={member.id}>
                  {isSOSActivator ? (
                    <>
                      <Circle
                        center={member.location!}
                        radius={100}
                        strokeColor="rgba(255, 59, 48, 0.8)"
                        strokeWidth={3}
                        fillColor="rgba(255, 59, 48, 0.2)"
                      />
                      <Circle
                        center={member.location!}
                        radius={50}
                        strokeColor="rgba(255, 59, 48, 1)"
                        strokeWidth={2}
                        fillColor="rgba(255, 59, 48, 0.3)"
                      />
                    </>
                  ) : null}
                  <Marker
                    coordinate={member.location!}
                    title={`${member.name}${titleSuffix}`}
                    description={isSOSActivator ? '🚨 NEEDS HELP!' : `Mode: ${member.locationMode.toUpperCase()}`}
                    pinColor={pinColor}
                  />
                </React.Fragment>
              );
            })}
        </MapView>

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

        {hasActiveTrip ? (
          <Animated.View
            style={[
              styles.memberPanel,
              {
                transform: [{ translateY: memberPanelTranslateY }],
              },
            ]}
          >
            <View style={styles.memberPanelHeader}>
              <Text style={styles.sectionTitle}>Members Status</Text>
              <View style={styles.startJourneyButtonContainer}>
                <TouchableOpacity
                  style={styles.startJourneyButton}
                  onPress={handleStartJourney}
                >
                  <Text style={styles.startJourneyButtonText}>{isInAppNavigation ? 'Stop' : 'Start'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={toggleMemberPanel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.memberPanelArrow}>{isMemberPanelExpanded ? '▼' : '▲'}</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memberPanelListContent}
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

          </Animated.View>
        ) : null}
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
              
              // No vibration for the person who presses SOS
              // Other members will vibrate via useEffect
            }}
          >
            <Text style={styles.sosBtnText}>{isSOSActive ? '✅ Cancel SOS' : '🚨 SOS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.navBtnText}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <BottomNavigationBar navigation={navigation} activeRoute="MapDashboard" />
      )}
    </SafeAreaView>
  );
}
