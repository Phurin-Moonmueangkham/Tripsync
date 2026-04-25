import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { reverseGeocode, getDirectionsRoute } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './MeetingPointScreen.styles';

const toAddressFallback = (coordinate: { latitude: number; longitude: number }) =>
  `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;

const MeetingPointScreen: React.FC<any> = ({ navigation }) => {
  const hasGoogleMapsApiKey = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [meetingRoutePoints, setMeetingRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    currentUserLocation,
    meetingPoint,
    meetingPointAddress,
    ownerId,
    meetingPointSetterId,
    setMeetingPoint,
    clearMeetingPoint,
  } = useTripStore();

  const isTripOwner = Boolean(userProfile?.uid && ownerId && userProfile.uid === ownerId);
  const canCancelMeetingPoint = Boolean(meetingPoint && isTripOwner && meetingPointSetterId);

  // Calculate route to meeting point when available
  useEffect(() => {
    if (!meetingPoint || !currentUserLocation) {
      setMeetingRoutePoints([]);
      return;
    }

    let cancelled = false;

    getDirectionsRoute(currentUserLocation, meetingPoint)
      .then((points) => {
        if (cancelled) {
          return;
        }
        setMeetingRoutePoints(points.length > 1 ? points : [currentUserLocation, meetingPoint]);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        // Keep guidance usable even when routing service is unavailable.
        setMeetingRoutePoints([currentUserLocation, meetingPoint]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserLocation, meetingPoint]);

  const initialRegion = useMemo(() => {
    if (currentUserLocation) {
      return {
        ...currentUserLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    if (meetingPoint) {
      return {
        ...meetingPoint,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return {
      latitude: 13.7563,
      longitude: 100.5018,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [currentUserLocation, meetingPoint]);

  const selectMeetingCoordinate = async (
    coordinate: { latitude: number; longitude: number },
    label?: string,
  ) => {
    setSelectedPoint(coordinate);

    if (label?.trim()) {
      setSelectedAddress(label.trim());
      return;
    }

    try {
      const address = await reverseGeocode(coordinate);
      setSelectedAddress(address);
    } catch {
      setSelectedAddress(toAddressFallback(coordinate));
    }
  };

  const handleMapPress = async (event: any) => {
    if (!isTripOwner) {
      Alert.alert('ไม่มีสิทธิ์', 'เฉพาะคนสร้างทริปเท่านั้นที่ปักหมุด Meeting ได้');
      return;
    }

    await selectMeetingCoordinate(event.nativeEvent.coordinate);
  };

  const handlePoiPress = async (event: any) => {
    if (!isTripOwner) {
      Alert.alert('ไม่มีสิทธิ์', 'เฉพาะคนสร้างทริปเท่านั้นที่ปักหมุด Meeting ได้');
      return;
    }

    const poi = event?.nativeEvent;

    if (!poi?.coordinate) {
      return;
    }

    await selectMeetingCoordinate(poi.coordinate, poi.name);
  };

  const handleSaveMeetingPoint = async () => {
    if (!isTripOwner) {
      Alert.alert('ไม่มีสิทธิ์', 'เฉพาะคนสร้างทริปเท่านั้นที่ปักหมุด Meeting ได้');
      return;
    }

    if (!selectedPoint) {
      Alert.alert('ยังไม่ได้ปักหมุด', 'แตะที่แผนที่ก่อนเพื่อกำหนดจุดนัดหมาย');
      return;
    }

    try {
      setIsLoading(true);
      await setMeetingPoint({
        coordinate: selectedPoint,
        address: selectedAddress || toAddressFallback(selectedPoint),
      });

      Alert.alert('สำเร็จ', 'ปักหมุดจุดนัดหมายเรียบร้อยแล้ว');
      navigation.goBack();
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกจุดนัดหมายได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMeetingPoint = async () => {
    if (!canCancelMeetingPoint) {
      return;
    }

    try {
      setIsLoading(true);
      await clearMeetingPoint();
      setSelectedPoint(null);
      setSelectedAddress('');
      Alert.alert('ยกเลิกแล้ว', 'ลบจุดนัดหมายเรียบร้อย');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถยกเลิกจุดนัดหมายได้';
      Alert.alert('ผิดพลาด', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>📍 Meeting Point</Text>
        <Text style={styles.subtitle}>แตะบนแผนที่หรือกดไอคอนสถานที่ (POI) เพื่อปักหมุดจุดนัดหมายของทีม</Text>
        {!isTripOwner ? <Text style={styles.ownerOnlyText}>เฉพาะคนสร้างทริปเท่านั้นที่สามารถปัก/ยกเลิกหมุดได้</Text> : null}
        <Text style={styles.hintText}>
          {selectedAddress || meetingPointAddress || 'ยังไม่มีจุดนัดหมาย'}
        </Text>
      </View>

      <View style={styles.mapCard}>
        {hasGoogleMapsApiKey ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            onPress={isTripOwner ? handleMapPress : undefined}
            onPoiClick={isTripOwner ? handlePoiPress : undefined}
            showsUserLocation
          >
            {currentUserLocation && (
              <Circle
                center={currentUserLocation}
                radius={15}
                fillColor="rgba(0, 122, 255, 0.15)"
                strokeColor="#007AFF"
                strokeWidth={2}
              />
            )}
            {meetingRoutePoints.length > 1 && <Polyline coordinates={meetingRoutePoints} strokeColor="#F6C80A" strokeWidth={3} />}
            {meetingPoint && <Marker coordinate={meetingPoint} title="Meeting Point" pinColor="#F6C80A" />}
            {selectedPoint && <Marker coordinate={selectedPoint} title="Selected Point" pinColor="#007AFF" />}
          </MapView>
        ) : (
          <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#0F172A' }]}>
            <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
              เปิดแผนที่ไม่ได้ใน Build นี้
            </Text>
            <Text style={{ color: '#CBD5E1', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              กรุณาตั้งค่า EXPO_PUBLIC_GOOGLE_MAPS_API_KEY แล้ว build Android ใหม่
            </Text>
          </View>
        )}
      </View>

      {isTripOwner ? (
        <View style={[styles.actionsRow, { paddingBottom: 8 + Math.round(insets.bottom * 0.67) }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMeetingPoint} disabled={isLoading}>
            <Text style={styles.saveBtnText}>📌 ปักหมุดจุดนัดหมาย</Text>
          </TouchableOpacity>
          {canCancelMeetingPoint ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClearMeetingPoint} disabled={isLoading}>
              <Text style={styles.cancelBtnText}>ยกเลิกหมุด</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default MeetingPointScreen;