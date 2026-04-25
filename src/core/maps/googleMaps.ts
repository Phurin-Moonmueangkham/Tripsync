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

type PhotonFeature = {
  geometry?: {
    coordinates?: number[];
  };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

type ArcGisCandidate = {
  address?: string;
  location?: {
    x?: number;
    y?: number;
  };
};

type ArcGisResponse = {
  candidates?: ArcGisCandidate[];
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
const PHOTON_BASE_URL = 'https://photon.komoot.io/api';
const ARCGIS_GEOCODE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const OSRM_BASE_URL = 'https://router.project-osrm.org';
const MAX_ROUTE_POINTS = 320;
const DEFAULT_COUNTRY_CODES = 'th';
const NOMINATIM_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent': 'TripSync/1.0 (expo; contact: tripsync-app)',
};
const PHOTON_SUPPORTED_LANGS = new Set(['de', 'en', 'fr']);

const readJsonSafely = async <T>(response: Response): Promise<T> => {
  const raw = await response.text();

  try {
    return JSON.parse(raw) as T;
  } catch {
    const normalized = raw.toLowerCase();

    if (normalized.includes('access denied')) {
      throw new Error('ระบบค้นหาถูกจำกัดชั่วคราว กรุณาลองใหม่อีกครั้งในอีกสักครู่');
    }

    throw new Error('ระบบค้นหาขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง');
  }
};

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
    countrycodes: DEFAULT_COUNTRY_CODES,
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
    // Keep nearby places ranked first, but do not hard-limit results to this box.
    // Intentionally do not set `bounded=1`.
  }

  return `${NOMINATIM_BASE_URL}/search?${params.toString()}`;
};

const buildPhotonSearchUrl = (query: string, options?: SuggestionOptions, limit = 6): string => {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const requestedLanguage = options?.language?.trim().toLowerCase();

  if (requestedLanguage && PHOTON_SUPPORTED_LANGS.has(requestedLanguage)) {
    params.set('lang', requestedLanguage);
  }

  if (options?.location) {
    params.set('lon', String(options.location.longitude));
    params.set('lat', String(options.location.latitude));
  }

  return `${PHOTON_BASE_URL}?${params.toString()}`;
};

const toPhotonGeocodeResult = (feature: PhotonFeature): GeocodeResult | null => {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const streetLine = [properties?.street, properties?.housenumber].filter(Boolean).join(' ').trim();
  const parts = [
    properties?.name,
    streetLine || undefined,
    properties?.city,
    properties?.district,
    properties?.state,
    properties?.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  const formattedAddress = parts.length > 0
    ? parts.join(', ')
    : formatCoordinateLabel({ latitude, longitude });

  return {
    formattedAddress,
    location: { latitude, longitude },
  };
};

const fetchPhotonResults = async (query: string, options?: SuggestionOptions, limit = 6): Promise<GeocodeResult[]> => {
  const endpoint = buildPhotonSearchUrl(query, options, limit);
  const response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
  const payload = await readJsonSafely<PhotonResponse>(response);

  if (!response.ok || !Array.isArray(payload.features)) {
    return [];
  }

  return payload.features
    .map((feature) => toPhotonGeocodeResult(feature))
    .filter((item): item is GeocodeResult => item !== null)
    .slice(0, limit);
};

const fetchArcGisResults = async (query: string, limit = 6): Promise<GeocodeResult[]> => {
  const params = new URLSearchParams({
    f: 'pjson',
    SingleLine: query,
    outFields: 'Match_addr,Addr_type',
    maxLocations: String(limit),
    countryCode: 'THA',
  });

  const response = await fetch(`${ARCGIS_GEOCODE_URL}?${params.toString()}`);
  const payload = await readJsonSafely<ArcGisResponse>(response);

  if (!response.ok || !Array.isArray(payload.candidates)) {
    return [];
  }

  return payload.candidates
    .map((candidate) => {
      const longitude = candidate.location?.x;
      const latitude = candidate.location?.y;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        formattedAddress: candidate.address?.trim() || formatCoordinateLabel({ latitude, longitude }),
        location: { latitude, longitude },
      } satisfies GeocodeResult;
    })
    .filter((item): item is GeocodeResult => item !== null)
    .slice(0, limit);
};

export const geocodeByText = async (query: string): Promise<GeocodeResult> => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error('Place not found.');
  }

  const endpoint = buildNominatimSearchUrl(trimmedQuery, undefined, 1);
  const response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
  const payload = await readJsonSafely<NominatimResult[]>(response);

  if ((!response.ok || !Array.isArray(payload) || payload.length === 0) && trimmedQuery) {
    const globalParams = new URLSearchParams({
      q: trimmedQuery,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
    });
    const globalResponse = await fetch(`${NOMINATIM_BASE_URL}/search?${globalParams.toString()}`, {
      headers: NOMINATIM_HEADERS,
    });
    const globalPayload = await readJsonSafely<NominatimResult[]>(globalResponse);

    if (globalResponse.ok && Array.isArray(globalPayload) && globalPayload.length > 0) {
      const firstGlobalResult = globalPayload[0];

      return {
        formattedAddress: firstGlobalResult.display_name,
        location: {
          latitude: parseCoordinate(firstGlobalResult.lat),
          longitude: parseCoordinate(firstGlobalResult.lon),
        },
      };
    }

    const photonResults = await fetchPhotonResults(trimmedQuery, { language: 'th' }, 1);

    if (photonResults.length > 0) {
      return photonResults[0];
    }

    const arcGisResults = await fetchArcGisResults(trimmedQuery, 1);

    if (arcGisResults.length > 0) {
      return arcGisResults[0];
    }
  }

  if (!response.ok || !Array.isArray(payload) || payload.length === 0) {
    throw new Error('ไม่พบสถานที่ที่ค้นหา ลองระบุชื่อสถานที่หรือจังหวัดให้ชัดขึ้น');
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
    secondaryText: 'แตะเพื่อค้นหาสถานที่นี้',
    fullText: trimmedQuery,
    isFallback: true,
  };

  const endpoint = buildNominatimSearchUrl(trimmedQuery, options, 6);
  try {
    const response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
    const payload = await readJsonSafely<NominatimResult[]>(response);

    if (!response.ok || !Array.isArray(payload)) {
      throw new Error('Autocomplete request failed.');
    }

    if (payload.length === 0 && options?.location) {
      // Retry globally when local area does not contain the destination.
      const fallbackEndpoint = buildNominatimSearchUrl(trimmedQuery, {
        language: options.language,
      }, 6);
      const fallbackResponse = await fetch(fallbackEndpoint, { headers: NOMINATIM_HEADERS });
      const fallbackPayload = await readJsonSafely<NominatimResult[]>(fallbackResponse);

      if (fallbackResponse.ok && Array.isArray(fallbackPayload) && fallbackPayload.length > 0) {
        return fallbackPayload.slice(0, 6).map(toPlaceSuggestion);
      }

      const globalParams = new URLSearchParams({
        q: trimmedQuery,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '6',
      });
      if (options.language?.trim()) {
        globalParams.set('accept-language', options.language.trim());
      }

      const globalResponse = await fetch(`${NOMINATIM_BASE_URL}/search?${globalParams.toString()}`, {
        headers: NOMINATIM_HEADERS,
      });
      const globalPayload = await readJsonSafely<NominatimResult[]>(globalResponse);

      if (globalResponse.ok && Array.isArray(globalPayload) && globalPayload.length > 0) {
        return globalPayload.slice(0, 6).map(toPlaceSuggestion);
      }

      const photonResults = await fetchPhotonResults(trimmedQuery, {
        language: options.language,
      }, 6);

      if (photonResults.length > 0) {
        return photonResults.map((result) => ({
          placeId: `photon:${result.location.latitude},${result.location.longitude}`,
          mainText: result.formattedAddress.split(',')[0]?.trim() || result.formattedAddress,
          secondaryText: result.formattedAddress,
          fullText: result.formattedAddress,
        }));
      }

      const arcGisResults = await fetchArcGisResults(trimmedQuery, 6);

      if (arcGisResults.length > 0) {
        return arcGisResults.map((result) => ({
          placeId: `arcgis:${result.location.latitude},${result.location.longitude}`,
          mainText: result.formattedAddress.split(',')[0]?.trim() || result.formattedAddress,
          secondaryText: result.formattedAddress,
          fullText: result.formattedAddress,
        }));
      }

      return [manualSuggestion];
    }

    if (payload.length === 0) {
      return [manualSuggestion];
    }

    const mapped = payload.slice(0, 6).map(toPlaceSuggestion);

    return mapped.length > 0 ? mapped : [manualSuggestion];
  } catch {
    try {
      const photonResults = await fetchPhotonResults(trimmedQuery, options, 1);

      if (photonResults.length > 0) {
        const first = photonResults[0];

        return [
          {
            placeId: `photon:${first.location.latitude},${first.location.longitude}`,
            mainText: first.formattedAddress.split(',')[0]?.trim() || first.formattedAddress,
            secondaryText: first.formattedAddress,
            fullText: first.formattedAddress,
            isFallback: true,
          },
        ];
      }

      const arcGisResults = await fetchArcGisResults(trimmedQuery, 1);

      if (arcGisResults.length > 0) {
        const first = arcGisResults[0];

        return [
          {
            placeId: `arcgis:${first.location.latitude},${first.location.longitude}`,
            mainText: first.formattedAddress.split(',')[0]?.trim() || first.formattedAddress,
            secondaryText: first.formattedAddress,
            fullText: first.formattedAddress,
            isFallback: true,
          },
        ];
      }

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

  if (normalizedPlaceId.startsWith('photon:')) {
    const coords = normalizedPlaceId.slice(7).split(',');

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

  if (normalizedPlaceId.startsWith('arcgis:')) {
    const coords = normalizedPlaceId.slice(7).split(',');

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
  const response = await fetch(endpoint, { headers: NOMINATIM_HEADERS });
  const payload = await readJsonSafely<{ display_name?: string }>(response);

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
