import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native';
import MapView, { MapPressEvent, Marker, Polyline, Circle } from 'react-native-maps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { geocodeByText, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';
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
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinLocation, setDroppedPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [droppedPinAddress, setDroppedPinAddress] = useState('');
  const [isMemberPanelExpanded, setIsMemberPanelExpanded] = useState(false);
  const [isInAppNavigation, setIsInAppNavigation] = useState(false);
  const memberPanelTranslateY = useRef(new Animated.Value(MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT)).current;
  const lastNavigationLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

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
    if (!hasActiveTrip) {
      setIsMemberPanelExpanded(false);
      setIsInAppNavigation(false);
      memberPanelTranslateY.setValue(MEMBER_PANEL_HEIGHT - MEMBER_PANEL_HANDLE_HEIGHT);
      lastNavigationLocationRef.current = null;
    }
  }, [hasActiveTrip, memberPanelTranslateY]);

  // Trigger vibration when someone else activates SOS (not the person who pressed it)
  useEffect(() => {
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
  }, [isSOSActive, sosActivatorName, sosActivatorId, userProfile?.uid]);

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

    if (isInAppNavigation) {
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
  }, [destination, hasActiveTrip, isInAppNavigation, members, routePoints]);

  useEffect(() => {
    if (!hasActiveTrip || !isInAppNavigation || !currentUserLocation) {
      return;
    }

    const previousLocation = lastNavigationLocationRef.current;
    const heading = previousLocation
      ? toHeading(previousLocation, currentUserLocation)
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
          {destination ? <Marker coordinate={destination} title="Destination" description={destinationAddress} pinColor="#FF3B30" /> : null}

          {routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeColor="#007AFF" strokeWidth={4} /> : null}

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
              const isHost = member.id === ownerId;
              const isSOSActivator = isSOSActive && member.id === sosActivatorId;

              // ลำดับสี: SOS > Host > Member
              let pinColor = '#007AFF'; // สีฟ้า (member ทั่วไป)
              let titleSuffix = '';

              if (isSOSActivator) {
                pinColor = '#FF3B30'; // สีแดง (SOS)
              } else if (isHost) {
                pinColor = '#FFD60A'; // สีเหลือง (Host)
                titleSuffix = ' (Host)';
              }

              if (isCurrentUser && !titleSuffix) {
                titleSuffix = ' (You)';
              } else if (isCurrentUser && titleSuffix === ' (Host)') {
                titleSuffix = ' (You - Host)';
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

          </Animated.View>
        ) : null}
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
