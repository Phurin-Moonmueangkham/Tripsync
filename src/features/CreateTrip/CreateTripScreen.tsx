import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, Polyline } from 'react-native-maps';
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';

type Coordinate = {
  latitude: number;
  longitude: number;
};

const DEFAULT_REGION = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

const CreateTripScreen: React.FC<any> = ({ navigation }) => {
  const mapRef = useRef<MapView>(null);
  const createTrip = useTripStore((state) => state.createTrip);
  const isTripLoading = useTripStore((state) => state.isTripLoading);

  const [tripName, setTripName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [destination, setDestination] = useState<Coordinate | null>(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [routePreview, setRoutePreview] = useState<Coordinate[]>([]);
  const [createdTripCode, setCreatedTripCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          return;
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        // Keep default region when location is unavailable.
      }
    };

    void initializeLocation();
  }, []);

  const initialRegion = useMemo(() => {
    if (!currentLocation) {
      return DEFAULT_REGION;
    }

    return {
      ...currentLocation,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [currentLocation]);

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
        location: currentLocation,
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
  }, [currentLocation, searchText]);

  const handleMapPress = async (event: MapPressEvent) => {
    if (!isMapExpanded) {
      setIsMapExpanded(true);
      return;
    }

    const coordinate = event.nativeEvent.coordinate;
    setDestination(coordinate);

    try {
      const address = await reverseGeocode(coordinate);
      setDestinationAddress(address);
      setSearchText(address);
    } catch {
      setDestinationAddress(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
    }
  };

  const handleSearchDestination = async () => {
    if (!searchText.trim()) {
      return;
    }

    setIsSearching(true);

    try {
      const result = await geocodeByText(searchText);
      setDestination(result.location);
      setDestinationAddress(result.formattedAddress);
      setSearchText(result.formattedAddress);
      setSuggestions([]);
      mapRef.current?.animateToRegion(
        {
          ...result.location,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Search failed', error.message);
      } else {
        Alert.alert('Search failed', 'Unable to search location.');
      }
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
      setDestination(place.location);
      setDestinationAddress(place.formattedAddress);
      setSearchText(place.formattedAddress);
      setSuggestions([]);
      mapRef.current?.animateToRegion(
        {
          ...place.location,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Search failed', error.message);
      } else {
        Alert.alert('Search failed', 'Unable to search location.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!tripName.trim()) {
      Alert.alert('Missing trip name', 'Please enter trip name.');
      return;
    }

    if (!destination) {
      Alert.alert('Missing destination', 'Please tap map to pin a destination.');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location unavailable', 'Please allow location access and try again.');
      return;
    }

    try {
      const routePoints = await getDirectionsRoute(currentLocation, destination);
      setRoutePreview(routePoints);

      const tripCode = await createTrip({
        tripName: tripName.trim(),
        destination,
        destinationAddress,
        routePoints,
      });

      setCreatedTripCode(tripCode);
      Alert.alert('Trip created', `Trip code: ${tripCode}`);
      navigation.navigate('MapDashboard');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Create trip failed', error.message);
      } else {
        Alert.alert('Create trip failed', 'Please try again.');
      }
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
        Alert.alert('Location unavailable', 'Please allow location access and try again.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCurrentLocation(nextLocation);
      mapRef.current?.animateToRegion(
        {
          ...nextLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
    } catch {
      Alert.alert('Location unavailable', 'Unable to get your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Create New Trip</Text>

      <TextInput
        style={styles.input}
        placeholder="Trip name"
        value={tripName}
        onChangeText={setTripName}
      />

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.searchInput]}
          placeholder="Search destination from Google Maps"
          value={searchText}
          onChangeText={(value) => {
            setSearchText(value);
          }}
          returnKeyType="search"
          onSubmitEditing={handleSearchDestination}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchDestination} disabled={isSearching}>
          <Text style={styles.searchBtnText}>{isSearching ? '...' : 'Find'}</Text>
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

      <View style={styles.mapCard}>
        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion} onPress={handleMapPress} showsUserLocation>
          {destination ? <Marker coordinate={destination} title="Destination" /> : null}
          {routePreview.length > 1 ? (
            <Polyline coordinates={routePreview} strokeColor="#007AFF" strokeWidth={4} />
          ) : null}
        </MapView>

        <View style={styles.expandHintContainer}>
          <Text style={styles.expandHintText}>Tap map to expand</Text>
        </View>

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

      <Modal visible={isMapExpanded} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsMapExpanded(false)}>
        <SafeAreaView style={styles.expandedMapContainer}>
          <MapView ref={mapRef} style={styles.expandedMap} initialRegion={initialRegion} onPress={handleMapPress} showsUserLocation>
            {destination ? <Marker coordinate={destination} title="Destination" /> : null}
            {routePreview.length > 1 ? (
              <Polyline coordinates={routePreview} strokeColor="#007AFF" strokeWidth={4} />
            ) : null}
          </MapView>

          <TouchableOpacity
            style={[styles.locateButton, isLocating && styles.locateButtonDisabled]}
            onPress={() => {
              void handleLocateMe();
            }}
            disabled={isLocating}
          >
            {isLocating ? <ActivityIndicator size="small" color="#1A1A2E" /> : <Text style={styles.locateButtonIcon}>⌖</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeExpandedMapButton} onPress={() => setIsMapExpanded(false)}>
            <Text style={styles.closeExpandedMapButtonText}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Text style={styles.destinationText} numberOfLines={2}>
        {destinationAddress || 'Tap map to pin destination'}
      </Text>

      <TouchableOpacity
        style={[styles.createButton, isTripLoading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={isTripLoading}
      >
        {isTripLoading ? <ActivityIndicator color="white" /> : <Text style={styles.createButtonText}>Create Trip</Text>}
      </TouchableOpacity>

      {createdTripCode ? <Text style={styles.codeText}>Trip Code: {createdTripCode}</Text> : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#1A1A2E' },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDE1E6',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  suggestionList: {
    marginTop: 8,
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
  suggestionTitle: {
    color: '#1A1A2E',
    fontWeight: '600',
    fontSize: 13,
  },
  suggestionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  mapCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE1E6',
    marginTop: 12,
    position: 'relative',
  },
  map: {
    height: 280,
    width: '100%',
  },
  expandedMapContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  expandedMap: {
    flex: 1,
    width: '100%',
  },
  expandHintContainer: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  expandHintText: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '600',
  },
  locateButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locateButtonDisabled: { opacity: 0.6 },
  locateButtonIcon: {
    color: '#1A1A2E',
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 20,
  },
  closeExpandedMapButton: {
    position: 'absolute',
    right: 10,
    bottom: 18,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeExpandedMapButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  destinationText: {
    marginTop: 10,
    color: '#333',
    fontSize: 13,
    minHeight: 36,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 6,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  codeText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: 1,
  },
});

export default CreateTripScreen;
