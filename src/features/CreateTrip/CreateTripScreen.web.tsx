import * as Location from 'expo-location';
import maplibregl from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { geocodeByText, getDirectionsRoute, getPlaceDetailsById, getPlaceSuggestions, PlaceSuggestion, reverseGeocode } from '../../core/maps/googleMaps';
import { useTripStore } from '../../core/store/useTripStore';
import { Coordinate, CreateTripRouteParams, DEFAULT_REGION } from './CreateTrip.helpers';
import { styles } from './CreateTrip.styles';

const CREATE_TRIP_POINTS_SOURCE_ID = 'create-trip-points-source';
const CREATE_TRIP_POINTS_LAYER_ID = 'create-trip-points-layer';
const CREATE_TRIP_POINTS_LABEL_LAYER_ID = 'create-trip-points-label-layer';

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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: [currentOrDefaultLocation.longitude, currentOrDefaultLocation.latitude],
      zoom: 12,
    });

    mapRef.current = map;

    map.on('load', () => {
      if (!map.getSource(CREATE_TRIP_POINTS_SOURCE_ID)) {
        map.addSource(CREATE_TRIP_POINTS_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });
      }

      if (!map.getLayer(CREATE_TRIP_POINTS_LAYER_ID)) {
        map.addLayer({
          id: CREATE_TRIP_POINTS_LAYER_ID,
          type: 'circle',
          source: CREATE_TRIP_POINTS_SOURCE_ID,
          paint: {
            'circle-radius': 7,
            'circle-color': ['coalesce', ['get', 'color'], '#007AFF'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          },
        });
      }

      if (!map.getLayer(CREATE_TRIP_POINTS_LABEL_LAYER_ID)) {
        map.addLayer({
          id: CREATE_TRIP_POINTS_LABEL_LAYER_ID,
          type: 'symbol',
          source: CREATE_TRIP_POINTS_SOURCE_ID,
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
      const coordinate = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };

      setDestination(coordinate);
      setDestinationAddress(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
      setSearchText(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);

      reverseGeocode(coordinate)
        .then((address) => {
          setDestinationAddress(address);
          setSearchText(address);
        })
        .catch(() => {
          // Keep coordinate label when reverse geocoding fails.
        });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [currentOrDefaultLocation.latitude, currentOrDefaultLocation.longitude]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const features: any[] = [];

    if (currentLocation) {
      features.push({
        type: 'Feature',
        id: 'current-location',
        geometry: {
          type: 'Point',
          coordinates: [currentLocation.longitude, currentLocation.latitude],
        },
        properties: {
          label: 'You',
          color: '#007AFF',
        },
      });
    }

    if (destination) {
      features.push({
        type: 'Feature',
        id: 'destination',
        geometry: {
          type: 'Point',
          coordinates: [destination.longitude, destination.latitude],
        },
        properties: {
          label: 'Destination',
          color: '#FF3B30',
        },
      });
    }

    const pointsSource = map.getSource(CREATE_TRIP_POINTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

    pointsSource?.setData({
      type: 'FeatureCollection',
      features,
    } as GeoJSON.FeatureCollection);
  }, [currentLocation, destination]);

  useEffect(() => {
    if (!destination || !mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: [destination.longitude, destination.latitude],
      zoom: 15,
      duration: 600,
    });
  }, [destination]);

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
      let routePoints: Coordinate[] = [currentOrDefaultLocation, destination];
      try {
        routePoints = await getDirectionsRoute(currentOrDefaultLocation, destination);
      } catch (routeError) {
        // Keep create-trip usable when public routing service is unavailable.
        console.warn('Route preview unavailable:', routeError);
      }

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
      const coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCurrentLocation(coordinate);

      if (mapRef.current) {
        mapRef.current.easeTo({
          center: [coordinate.longitude, coordinate.latitude],
          zoom: 15,
          duration: 700,
        });
      }
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

    const url = `https://www.openstreetmap.org/?mlat=${target.latitude}&mlon=${target.longitude}#map=16/${target.latitude}/${target.longitude}`;
    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Create New Trip</Text>

        <TextInput
          style={styles.input}
          placeholder="Trip name"
          placeholderTextColor="#E5E7EB"
          value={tripName}
          onChangeText={setTripName}
        />

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            placeholder="Search destination"
            placeholderTextColor="#E5E7EB"
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
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: 260,
              backgroundColor: '#DCE6F5',
            }}
          />

          <View style={{ position: 'absolute', left: 12, bottom: 12, right: 64 }}>
            <Text style={{ color: '#1A1A2E', fontSize: 12, fontWeight: '600' }}>
              คลิกบนแผนที่เพื่อปักหมุดปลายทาง
            </Text>
          </View>

          <TouchableOpacity
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              backgroundColor: '#007AFF',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            onPress={() => {
              void handleOpenExternalMap();
            }}
          >
            <Text style={styles.searchBtnText}>Open OSM</Text>
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
        {routePreview.length > 1 ? <Text style={styles.routePreviewText}>Route preview points: {routePreview.length}</Text> : null}
      </View>
    </SafeAreaView>
  );
};

export default CreateTripScreen;