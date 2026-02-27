export const MEMBER_PANEL_HEIGHT = 240;
export const MEMBER_PANEL_HANDLE_HEIGHT = 48;

type Coordinate = {
  latitude: number;
  longitude: number;
};

export const toHeading = (
  from: Coordinate,
  to: Coordinate,
): number => {
  const fromLat = (from.latitude * Math.PI) / 180;
  const fromLng = (from.longitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const toLng = (to.longitude * Math.PI) / 180;
  const deltaLng = toLng - fromLng;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
};
