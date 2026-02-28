import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';
import { Coordinate, CreateTripRouteParams, DEFAULT_REGION } from './CreateTrip.helpers';
import { styles } from './CreateTrip.styles';

const CreateTripScreen: React.FC<any> = ({ navigation, route }) => {
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
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);

  const routeParams = (route?.params ?? {}) as CreateTripRouteParams;

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

  const currentOrDefaultLocation = useMemo(() => {
    if (currentLocation) {
      return currentLocation;
    }

    return {
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
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

  useEffect(() => {
    if (!routeParams.prefillDestination) {
      return;
    }

    setDestination(routeParams.prefillDestination);

    if (routeParams.prefillAddress) {
      setDestinationAddress(routeParams.prefillAddress);
      setSearchText(routeParams.prefillAddress);
    }
  }, [routeParams.prefillAddress, routeParams.prefillDestination]);

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
      Alert.alert('Missing destination', 'Please search and select destination first.');
      return;
    }

    try {
      const routePoints = await getDirectionsRoute(currentOrDefaultLocation, destination);
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
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      Alert.alert('Location unavailable', 'Unable to get your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleOpenExternalMap = async () => {
    const target = destination ?? currentLocation;

    if (!target) {
      Alert.alert('No location selected', 'Search destination or use locate me first.');
      return;
    }

    const url = `https://www.google.com/maps?q=${target.latitude},${target.longitude}`;
    await Linking.openURL(url);
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
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF3FA', height: 220 }]}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A2E' }}>Web Destination Picker</Text>
          <Text style={{ marginTop: 8, color: '#4F5B6B', textAlign: 'center', paddingHorizontal: 20 }}>
            เลือกปลายทางจากช่องค้นหา แล้วเปิดดูบน Google Maps
          </Text>
          {destination ? (
            <Text style={{ marginTop: 8, color: '#4F5B6B' }}>
              {destination.latitude.toFixed(5)}, {destination.longitude.toFixed(5)}
            </Text>
          ) : null}

          <TouchableOpacity style={[styles.searchBtn, { marginTop: 12 }]} onPress={() => { void handleOpenExternalMap(); }}>
            <Text style={styles.searchBtnText}>Open in Google Maps</Text>
          </TouchableOpacity>
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

      <Text style={styles.destinationText} numberOfLines={2}>
        {destinationAddress || 'Search and select destination'}
      </Text>

      <TouchableOpacity
        style={[styles.createButton, isTripLoading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={isTripLoading}
      >
        {isTripLoading ? <ActivityIndicator color="white" /> : <Text style={styles.createButtonText}>Create Trip</Text>}
      </TouchableOpacity>

      {createdTripCode ? <Text style={styles.codeText}>Trip Code: {createdTripCode}</Text> : null}
      {routePreview.length > 1 ? <Text style={styles.destinationText}>Route preview points: {routePreview.length}</Text> : null}
    </SafeAreaView>
  );
};

export default CreateTripScreen;