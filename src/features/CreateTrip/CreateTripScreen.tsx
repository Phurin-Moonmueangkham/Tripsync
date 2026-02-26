import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, Polyline } from 'react-native-maps';
import { geocodeByText, getDirectionsRoute, reverseGeocode } from '../../core/maps/googleMaps';
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

  const handleMapPress = async (event: MapPressEvent) => {
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
          onChangeText={setSearchText}
          returnKeyType="search"
          onSubmitEditing={handleSearchDestination}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchDestination} disabled={isSearching}>
          <Text style={styles.searchBtnText}>{isSearching ? '...' : 'Find'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapCard}>
        <MapView style={styles.map} initialRegion={initialRegion} onPress={handleMapPress}>
          {destination ? <Marker coordinate={destination} title="Destination" /> : null}
          {routePreview.length > 1 ? (
            <Polyline coordinates={routePreview} strokeColor="#007AFF" strokeWidth={4} />
          ) : null}
        </MapView>
      </View>

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
  mapCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDE1E6',
    marginTop: 12,
  },
  map: {
    height: 280,
    width: '100%',
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
