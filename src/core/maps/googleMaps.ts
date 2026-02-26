type Coordinate = {
  latitude: number;
  longitude: number;
};

type GeocodeResult = {
  formattedAddress: string;
  location: Coordinate;
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
