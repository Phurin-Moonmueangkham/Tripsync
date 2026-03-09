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
type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
};

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    geometry?: {
      coordinates?: number[][];
    };
  }>;
};

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OSRM_BASE_URL = 'https://router.project-osrm.org';
const MAX_ROUTE_POINTS = 320;

const parseCoordinate = (value: string): number => {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid coordinate value from geocoder.');
  }

  return parsed;
};

const formatCoordinateLabel = (coordinate: Coordinate): string => `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;

const downsampleRoute = (points: Coordinate[], maxPoints: number): Coordinate[] => {
  if (points.length <= maxPoints) {
    return points;
  }

  if (maxPoints < 2) {
    return [points[0], points[points.length - 1]];
  }

  const result: Coordinate[] = [points[0]];
  const interiorSlots = maxPoints - 2;
  const usedIndices = new Set<number>([0, points.length - 1]);

  for (let index = 1; index <= interiorSlots; index += 1) {
    const pointIndex = Math.floor(index * (points.length - 1) / (maxPoints - 1));
    
    if (!usedIndices.has(pointIndex) && pointIndex > 0 && pointIndex < points.length - 1) {
      result.push(points[pointIndex]);
      usedIndices.add(pointIndex);
    }
  }

  result.push(points[points.length - 1]);
  return result;
};

const toPlaceSuggestion = (item: NominatimResult): PlaceSuggestion => {
  const title = item.name?.trim() || item.display_name.split(',')[0]?.trim() || item.display_name;
  const placeId = `osm:${item.lat},${item.lon}`;

  return {
    placeId,
    mainText: title,
    secondaryText: item.display_name,
    fullText: item.display_name,
  };
};

const buildNominatimSearchUrl = (query: string, options?: SuggestionOptions, limit = 6): string => {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
  });

  if (options?.language?.trim()) {
    params.set('accept-language', options.language.trim());
  }

  if (options?.location) {
    const radius = options.radiusMeters ?? 30000;
    const degrees = radius / 111000;
    const left = options.location.longitude - degrees;
    const right = options.location.longitude + degrees;
    const top = options.location.latitude + degrees;
    const bottom = options.location.latitude - degrees;
    params.set('viewbox', `${left},${top},${right},${bottom}`);
    params.set('bounded', '1');
  }

  return `${NOMINATIM_BASE_URL}/search?${params.toString()}`;
};

export const geocodeByText = async (query: string): Promise<GeocodeResult> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error('Place not found.');
  }

  const endpoint = buildNominatimSearchUrl(trimmedQuery, undefined, 1);
  const response = await fetch(endpoint);
  const payload = await response.json() as NominatimResult[];

  if (!response.ok || !Array.isArray(payload) || payload.length === 0) {
    throw new Error('Place not found.');
  }

  const firstResult = payload[0];

  return {
    formattedAddress: firstResult.display_name,
    location: {
      latitude: parseCoordinate(firstResult.lat),
      longitude: parseCoordinate(firstResult.lon),
    },
  };
};

export const getPlaceSuggestions = async (query: string, options?: SuggestionOptions): Promise<PlaceSuggestion[]> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const manualSuggestion: PlaceSuggestion = {
    placeId: `manual:${trimmedQuery}`,
    mainText: trimmedQuery,
    secondaryText: 'Tap to search this location',
    fullText: trimmedQuery,
    isFallback: true,
  };

  const endpoint = buildNominatimSearchUrl(trimmedQuery, options, 6);
  try {
    const response = await fetch(endpoint);
    const payload = await response.json() as NominatimResult[];

    if (!response.ok || !Array.isArray(payload)) {
      throw new Error('Autocomplete request failed.');
    }

    if (payload.length === 0) {
      return [manualSuggestion];
    }

    const mapped = payload.slice(0, 6).map(toPlaceSuggestion);

    return mapped.length > 0 ? mapped : [manualSuggestion];
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
      return [manualSuggestion];
    }
  }
};

export const getPlaceDetailsById = async (placeId: string): Promise<GeocodeResult> => {
  const normalizedPlaceId = placeId.trim();

  if (!normalizedPlaceId) {
    throw new Error('Missing place id.');
  }

  if (normalizedPlaceId.startsWith('osm:')) {
    const coords = normalizedPlaceId.slice(4).split(',');

    if (coords.length === 2) {
      const latitude = Number.parseFloat(coords[0]);
      const longitude = Number.parseFloat(coords[1]);

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const coordinate = { latitude, longitude };
        const formattedAddress = await reverseGeocode(coordinate);

        return {
          formattedAddress,
          location: coordinate,
        };
      }
    }
  }

  return geocodeByText(normalizedPlaceId);
};

export const reverseGeocode = async (coordinate: Coordinate): Promise<string> => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(coordinate.latitude),
    lon: String(coordinate.longitude),
    zoom: '18',
    addressdetails: '1',
  });
  const endpoint = `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`;
  const response = await fetch(endpoint);
  const payload = await response.json() as { display_name?: string };

  if (!response.ok || typeof payload.display_name !== 'string' || !payload.display_name.trim()) {
    return formatCoordinateLabel(coordinate);
  }

  return payload.display_name;
};

export const getDirectionsRoute = async (origin: Coordinate, destination: Coordinate): Promise<Coordinate[]> => {
  const endpoint = `${OSRM_BASE_URL}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  const response = await fetch(endpoint);
  const payload = await response.json() as OsrmRouteResponse;

  if (!response.ok || payload.code !== 'Ok' || !Array.isArray(payload.routes) || payload.routes.length === 0) {
    throw new Error('Unable to build route from OpenStreetMap services.');
  }

  const rawCoordinates = payload.routes[0]?.geometry?.coordinates;

  if (!Array.isArray(rawCoordinates) || rawCoordinates.length === 0) {
    return [origin, destination];
  }

  const mapped = rawCoordinates
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map((pair) => ({
      latitude: Number(pair[1]),
      longitude: Number(pair[0]),
    }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  if (mapped.length <= 1) {
    return [origin, destination];
  }

  return downsampleRoute(mapped, MAX_ROUTE_POINTS);
};
