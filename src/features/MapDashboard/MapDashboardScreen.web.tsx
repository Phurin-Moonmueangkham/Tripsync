import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { geocodeByText, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './MapDashboard.styles';

export default function MapDashboardScreen({ navigation }: any) {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isInAppNavigation, setIsInAppNavigation] = useState(false);

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    currentTripCode,
    tripName,
    members,
    destination,
    destinationAddress,
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

  const activeLocation = useMemo(() => {
    if (searchedLocation) {
      return searchedLocation;
    }

    if (destination) {
      return destination;
    }

    return currentUserLocation;
  }, [currentUserLocation, destination, searchedLocation]);

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

    const url = `https://www.google.com/maps?q=${activeLocation.latitude},${activeLocation.longitude}`;
    await Linking.openURL(url);
  };

  const handleCreateTripFromSearch = () => {
    if (!searchedLocation || hasActiveTrip) {
      return;
    }

    navigation.navigate('CreateTrip', {
      prefillDestination: searchedLocation,
      prefillAddress: searchText.trim(),
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
    Alert.alert('เริ่มโหมดนำทาง', 'สำหรับเว็บ ระบบจะเปิดนำทางผ่าน Google Maps ภายนอก');
  };

  return (
    <SafeAreaView style={[styles.container, !hasActiveTrip && styles.noTripContainer]}>
      {hasActiveTrip && isSOSActive ? (
        <View style={styles.sosBanner}>
          <Text style={styles.sosText}>🚨 ALERT! Someone needs help! 🚨</Text>
        </View>
      ) : null}

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
        <View style={[hasActiveTrip ? styles.map : styles.fullMap, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF3FA' }]}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A2E' }}>Web Map Mode</Text>
          <Text style={{ marginTop: 8, color: '#4F5B6B', textAlign: 'center', paddingHorizontal: 20 }}>
            ใช้การค้นหาสถานที่และเปิดเส้นทางผ่าน Google Maps ได้บนเว็บ
          </Text>
          {activeLocation ? (
            <Text style={{ marginTop: 8, color: '#4F5B6B' }}>
              {activeLocation.latitude.toFixed(5)}, {activeLocation.longitude.toFixed(5)}
            </Text>
          ) : null}
          <TouchableOpacity style={[styles.searchButton, { marginTop: 14 }]} onPress={() => { void handleOpenExternalMap(); }}>
            <Text style={styles.searchButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
          {!hasActiveTrip && searchedLocation ? (
            <TouchableOpacity style={[styles.mapTypeButton, { marginTop: 10, alignSelf: 'center' }]} onPress={handleCreateTripFromSearch}>
              <Text style={styles.mapTypeButtonText}>Create trip from this location</Text>
            </TouchableOpacity>
          ) : null}
        </View>

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