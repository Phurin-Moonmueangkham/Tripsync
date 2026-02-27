export type Coordinate = {
  latitude: number;
  longitude: number;
};

export const DEFAULT_REGION = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export type CreateTripRouteParams = {
  prefillDestination?: Coordinate;
  prefillAddress?: string;
};
