import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { MapPressEvent, Marker, Polyline, Circle } from 'react-native-maps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';
import BottomNavigationBar from '../../components/BottomNavigationBar';
import { MEMBER_PANEL_HANDLE_HEIGHT, MEMBER_PANEL_HEIGHT, toHeading } from './MapDashboard.helpers';
import { styles } from './MapDashboard.styles';

export default function MapDashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const lastManualCameraChangeAt = useRef(0);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isLeavingTrip, setIsLeavingTrip] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinLocation, setDroppedPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinAddress, setDroppedPinAddress] = useState('');
  const [isMemberPanelExpanded, setIsMemberPanelExpanded] = useState(false);
  const [isInAppNavigation, setIsInAppNavigation] = useState(false);
  const [meetingRoutePoints, setMeetingRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [sosRoutePoints, setSosRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const memberPanelTranslateY = useRef(new Animated.Value(MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT)).current;
  const lastNavigationLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const sosVibrationTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const manualFocusUntilRef = useRef(0);
  const hasCenteredOnCurrentLocationRef = useRef(false);

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    currentTripCode,
    tripName,
    ownerId,
    members,
    destination,
    destinationAddress,
    meetingPoint,
    routePoints,
    isSOSActive,
    sosActivatorId,
    sosActivatorName,
    sosActivatorLocation,
    currentUserLocation,
    locationMode,
    tripError,
    triggerSOS,
    leaveTrip,
    startLocationTracking,
    stopLocationTracking,
  } = useTripStore();

  const hasActiveTrip = Boolean(currentTripCode);
  const currentUid = userProfile?.uid ?? null;

  const clearSosVibrationQueue = () => {
    sosVibrationTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    sosVibrationTimeoutsRef.current = [];
  };

  useEffect(() => {
    if (!hasActiveTrip) {
      setIsMemberPanelExpanded(false);
      setIsInAppNavigation(false);
      setMeetingRoutePoints([]);
      setSosRoutePoints([]);
      memberPanelTranslateY.setValue(MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT);
      lastNavigationLocationRef.current = null;
      manualFocusUntilRef.current = 0;
      hasCenteredOnCurrentLocationRef.current = false;
    }
  }, [hasActiveTrip, memberPanelTranslateY]);

  // Trigger vibration when someone else activates SOS (not the person who pressed it)
  useEffect(() => {
    clearSosVibrationQueue();

    if (isSOSActive && sosActivatorName && sosActivatorId && sosActivatorId !== userProfile?.uid) {
      try {
        // Queue vibration pulses and keep timeout IDs so we can cancel instantly on SOS off.
        for (let i = 0; i < 10; i += 1) {
          const timeoutId = setTimeout(() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, i * 800);
          sosVibrationTimeoutsRef.current.push(timeoutId);
        }
      } catch {
        // Vibration not available
      }
    }

    return () => {
      clearSosVibrationQueue();
    };
  }, [isSOSActive, sosActivatorName, sosActivatorId, userProfile?.uid]);

  useEffect(() => {
    if (!hasActiveTrip || !meetingPoint || !currentUserLocation) {
      setMeetingRoutePoints([]);
      return;
    }

    let cancelled = false;

    getDirectionsRoute(currentUserLocation, meetingPoint)
      .then((points) => {
        if (cancelled) {
          return;
        }
        setMeetingRoutePoints(points.length > 1 ? points : [currentUserLocation, meetingPoint]);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        // Keep guidance usable even when routing service is unavailable.
        setMeetingRoutePoints([currentUserLocation, meetingPoint]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserLocation, hasActiveTrip, meetingPoint]);

  useEffect(() => {
    if (!isSOSActive || !sosActivatorLocation || !currentUserLocation) {
      setSosRoutePoints([]);
      return;
    }

    let cancelled = false;

    getDirectionsRoute(currentUserLocation, sosActivatorLocation)
      .then((points) => {
        if (cancelled) {
          return;
        }

        setSosRoutePoints(points.length > 1 ? points : [currentUserLocation, sosActivatorLocation]);
      })
      .catch(() => {
        if (!cancelled) {
          setSosRoutePoints([currentUserLocation, sosActivatorLocation]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserLocation, isSOSActive, sosActivatorLocation]);

  useEffect(() => {
    void startLocationTracking();

    return () => {
      void stopLocationTracking();
    };
  }, [startLocationTracking, stopLocationTracking, locationMode]);

  const initialRegion = useMemo(() => {
    if (currentUserLocation) {
      return {
        ...currentUserLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    if (destination) {
      return {
        ...destination,
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
    if (!hasActiveTrip || !currentUserLocation) {
      return;
    }

    if (!hasCenteredOnCurrentLocationRef.current) {
      hasCenteredOnCurrentLocationRef.current = true;

      mapRef.current?.animateToRegion(
        {
          ...currentUserLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        700,
      );

      return;
    }

    if (Date.now() < manualFocusUntilRef.current) {
      return;
    }

    const previousLocation = lastNavigationLocationRef.current;
    const heading = previousLocation
      ? toHeading(previousLocation, currentUserLocation)
      : destination
        ? toHeading(currentUserLocation, destination)
        : 0;

    if (isInAppNavigation) {
      mapRef.current?.animateCamera(
        {
          center: currentUserLocation,
          heading,
          pitch: 52,
          zoom: 17,
        },
        { duration: 700 },
      );
    } else {
      mapRef.current?.animateToRegion(
        {
          ...currentUserLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        700,
      );
    }

    lastNavigationLocationRef.current = currentUserLocation;
  }, [currentUserLocation, destination, hasActiveTrip, isInAppNavigation]);

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

      manualFocusUntilRef.current = 0;
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

  const handleFocusMember = (member: (typeof members)[number]) => {
    if (!member.location) {
      return;
    }

    // Pause auto-follow briefly so users can inspect another member.
    manualFocusUntilRef.current = Date.now() + 10000;
    lastManualCameraChangeAt.current = Date.now();
    mapRef.current?.animateToRegion(
      {
        ...member.location,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      600,
    );
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

    if (!destination) {
      Alert.alert('ยังไม่มีปลายทาง', 'กรุณาตั้งปลายทางของทริปก่อนเริ่มนำทาง');
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

  const handleTapSosAlert = () => {
    if (!hasActiveTrip || !isSOSActive || !sosActivatorLocation || !currentUserLocation) {
      return;
    }

    manualFocusUntilRef.current = Date.now() + 25000;
    const route = sosRoutePoints.length > 1 ? sosRoutePoints : [currentUserLocation, sosActivatorLocation];

    if (route.length > 1) {
      mapRef.current?.fitToCoordinates(route, {
        edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
        animated: true,
      });
      return;
    }

    mapRef.current?.animateToRegion(
      {
        ...sosActivatorLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      700,
    );
  };

  const handleShowTripCode = () => {
    if (!currentTripCode) {
      return;
    }

    Alert.alert('Trip Code', currentTripCode);
  };

  const handleLeaveTrip = () => {
    if (isLeavingTrip) {
      return;
    }

    Alert.alert('Leave Trip', 'Are you sure you want to leave this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLeavingTrip(true);
            await leaveTrip();
            navigation.navigate('Home');
          } catch {
            Alert.alert('Error', 'Failed to leave trip');
          } finally {
            setIsLeavingTrip(false);
          }
        },
      },
    ]);
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity style={styles.codeButton} onPress={handleShowTripCode}>
              <Text style={styles.codeButtonText}>Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={hasActiveTrip ? styles.mapCard : styles.mapFullScreen}>
        <MapView
          ref={mapRef}
          style={hasActiveTrip ? styles.map : styles.fullMap}
          initialRegion={initialRegion}
          mapType={mapType}
          showsUserLocation
          onPress={(event) => {
            void handleMapPress(event);
          }}
        >
          {destination ? <Marker coordinate={destination} title="Destination" description={destinationAddress} pinColor="#007AFF" /> : null}

          {!meetingPoint && routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeColor="#007AFF" strokeWidth={4} /> : null}

          {meetingRoutePoints.length > 1 ? <Polyline coordinates={meetingRoutePoints} strokeColor="#F6C80A" strokeWidth={4} /> : null}

          {sosRoutePoints.length > 1 ? <Polyline coordinates={sosRoutePoints} strokeColor="#D00000" strokeWidth={5} /> : null}

          {meetingPoint ? <Marker coordinate={meetingPoint} title="Meeting Point" pinColor="#F6C80A" /> : null}

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
            .filter((member) => member.location && member.id !== currentUid)
            .map((member) => {
              const isSOSActivator = isSOSActive && member.id === sosActivatorId;

              let pinColor = '#34C759';
              let titleSuffix = '';

              if (isSOSActivator) {
                pinColor = '#FF3B30';
              }

              if (member.id === ownerId) {
                titleSuffix = ' (Host)';
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
          {isSOSActive && hasActiveTrip ? (
            <View style={[styles.searchBox, { backgroundColor: '#FF3B30', borderColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 14 }]}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={handleTapSosAlert}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 }}>
                  🚨 {sosActivatorName} needs help!
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                  Tap this alert to focus SOS route
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  clearSosVibrationQueue();
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
                placeholderTextColor="#E5E7EB"
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

          </Animated.View>
        ) : null}
      </View>

      {hasActiveTrip && tripError ? <Text style={styles.errorText}>{tripError}</Text> : null}

      {hasActiveTrip ? (
        <View style={[styles.bottomNav, { paddingBottom: 8 + Math.round(insets.bottom * 0.67) }]}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('MeetingPoint')}>
            <Text style={styles.navBtnText}>📍 Set Point</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sosBtn, isSOSActive && styles.sosBtnActive]}
            onPress={async () => {
              const newSOSState = !isSOSActive;

              if (!newSOSState) {
                clearSosVibrationQueue();
              }

              await triggerSOS(newSOSState);
              
              // No vibration for the person who presses SOS
              // Other members will vibrate via useEffect
            }}
          >
            <Text style={styles.sosBtnText}>{isSOSActive ? '✅ Cancel SOS' : '🚨 SOS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: '#D9534F' }, isLeavingTrip && { opacity: 0.6 }]}
            onPress={handleLeaveTrip}
            disabled={isLeavingTrip}
          >
            <Text style={[styles.navBtnText, { color: 'white' }]}>{isLeavingTrip ? 'Leaving...' : 'Leave Trip'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <BottomNavigationBar navigation={navigation} activeRoute="MapDashboard" />
      )}
    </SafeAreaView>
  );
}
