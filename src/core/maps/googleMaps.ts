type Coordinate = {
  latitude: number;
  longitude: number;
};

type GeocodeResult = {
  formattedAddress: string;
  location: Coordinate;
};

export type PlaceSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  isFallback?: boolean;
};

type SuggestionOptions = {
  language?: string;
  location?: Coordinate | null;
  radiusMeters?: number;
};

const getGoogleMapsApiKey = (): string => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env');
  }

  return key;
};

const decodePolyline = (encoded: string): Coordinate[] => {
  const path: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLatitude = result & 1 ? ~(result >> 1) : result >> 1;
    latitude += deltaLatitude;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLongitude = result & 1 ? ~(result >> 1) : result >> 1;
    longitude += deltaLongitude;

    path.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return path;
};

export const geocodeByText = async (query: string): Promise<GeocodeResult> => {
  const apiKey = getGoogleMapsApiKey();
  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok || payload.status !== 'OK' || !payload.results?.length) {
    throw new Error('Place not found.');
  }

  const firstResult = payload.results[0];

  return {
    formattedAddress: firstResult.formatted_address,
    location: {
      latitude: firstResult.geometry.location.lat,
      longitude: firstResult.geometry.location.lng,
    },
  };
};

export const getPlaceSuggestions = async (query: string, options?: SuggestionOptions): Promise<PlaceSuggestion[]> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const apiKey = getGoogleMapsApiKey();
  const language = options?.language?.trim() || 'th';
  const radius = options?.radiusMeters ?? 30000;
  const locationBias = options?.location
    ? `&location=${options.location.latitude},${options.location.longitude}&radius=${radius}`
    : '';
  const endpoint = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(trimmedQuery)}&language=${encodeURIComponent(language)}${locationBias}&key=${apiKey}`;
  try {
    const response = await fetch(endpoint);
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload.predictions)) {
      throw new Error(payload?.error_message || 'Autocomplete request failed.');
    }

    if (payload.status === 'ZERO_RESULTS') {
      return [];
    }

    if (payload.status !== 'OK') {
      throw new Error(payload?.error_message || payload.status || 'Autocomplete request failed.');
    }

    return payload.predictions.slice(0, 6).map((prediction: any) => ({
      placeId: String(prediction.place_id ?? ''),
      mainText: String(prediction.structured_formatting?.main_text ?? prediction.description ?? ''),
      secondaryText: String(prediction.structured_formatting?.secondary_text ?? ''),
      fullText: String(prediction.description ?? ''),
    }));
  } catch {
    try {
      const geocode = await geocodeByText(trimmedQuery);

      return [
        {
          placeId: `geocode:${trimmedQuery}`,
          mainText: geocode.formattedAddress,
          secondaryText: '',
          fullText: geocode.formattedAddress,
          isFallback: true,
        },
      ];
    } catch {
      return [];
    }
  }
};

export const getPlaceDetailsById = async (placeId: string): Promise<GeocodeResult> => {
  const normalizedPlaceId = placeId.trim();

  if (!normalizedPlaceId) {
    throw new Error('Missing place id.');
  }

  const apiKey = getGoogleMapsApiKey();
  const endpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(normalizedPlaceId)}&fields=formatted_address,geometry/location,name&key=${apiKey}`;
  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok || payload.status !== 'OK' || !payload.result?.geometry?.location) {
    throw new Error('Unable to load place details.');
  }

  const location = payload.result.geometry.location;

  return {
    formattedAddress: typeof payload.result.formatted_address === 'string'
      ? payload.result.formatted_address
      : typeof payload.result.name === 'string'
        ? payload.result.name
        : normalizedPlaceId,
    location: {
      latitude: location.lat,
      longitude: location.lng,
    },
  };
};

export const reverseGeocode = async (coordinate: Coordinate): Promise<string> => {
  const apiKey = getGoogleMapsApiKey();
  const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${apiKey}`;
  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok || payload.status !== 'OK' || !payload.results?.length) {
    return `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;
  }

  return payload.results[0].formatted_address;
};

export const getDirectionsRoute = async (origin: Coordinate, destination: Coordinate): Promise<Coordinate[]> => {
  const apiKey = getGoogleMapsApiKey();
  const endpoint = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${apiKey}`;
  const response = await fetch(endpoint);
  const payload = await response.json();

  if (!response.ok || payload.status !== 'OK' || !payload.routes?.length) {
    throw new Error('Unable to build route from Google Maps.');
  }

  const encoded = payload.routes[0]?.overview_polyline?.points;

  if (typeof encoded !== 'string' || !encoded.length) {
    return [origin, destination];
  }

  return decodePolyline(encoded);
};
