import React, { useMemo, useState } from 'react';
import { Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, MapPressEvent, Marker } from 'react-native-maps';
import { reverseGeocode } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './MeetingPointScreen.styles';

const toAddressFallback = (coordinate: { latitude: number; longitude: number }) =>
  `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;

const MeetingPointScreen: React.FC<any> = ({ navigation }) => {
  const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');

  const userProfile = useAuthStore((state) => state.userProfile);
  const {
    currentUserLocation,
    ownerId,
    meetingPoint,
    meetingPointAddress,
    meetingPointSetterId,
    setMeetingPoint,
    clearMeetingPoint,
  } = useTripStore();

  const isTripOwner = Boolean(userProfile?.uid && ownerId && userProfile.uid === ownerId);
  const canCancelMeetingPoint = Boolean(meetingPoint && isTripOwner && meetingPointSetterId);

  const initialRegion = useMemo(() => {
    const base = selectedPoint || meetingPoint || currentUserLocation || { latitude: 13.7563, longitude: 100.5018 };

    return {
      ...base,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
  }, [currentUserLocation, meetingPoint, selectedPoint]);

  const handleMapPress = async (event: MapPressEvent) => {
    if (!isTripOwner) {
      return;
    }

    const coordinate = event.nativeEvent.coordinate;
    setSelectedPoint(coordinate);

    try {
      const address = await reverseGeocode(coordinate);
      setSelectedAddress(address);
    } catch {
      setSelectedAddress(toAddressFallback(coordinate));
    }
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
      await setMeetingPoint({
        coordinate: selectedPoint,
        address: selectedAddress || toAddressFallback(selectedPoint),
      });

      Alert.alert('สำเร็จ', 'ปักหมุดจุดนัดหมายเรียบร้อยแล้ว');
      navigation.goBack();
    } catch {
      Alert.alert('ผิดพลาด', 'ไม่สามารถบันทึกจุดนัดหมายได้');
    }
  };

  const handleClearMeetingPoint = async () => {
    if (!canCancelMeetingPoint) {
      return;
    }

    try {
      await clearMeetingPoint();
      setSelectedPoint(null);
      setSelectedAddress('');
      Alert.alert('ยกเลิกแล้ว', 'ลบจุดนัดหมายเรียบร้อย');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถยกเลิกจุดนัดหมายได้';
      Alert.alert('ผิดพลาด', message);
    }
  };

  const activePoint = selectedPoint || meetingPoint;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Meeting Point</Text>
        <Text style={styles.subtitle}>แตะบนแผนที่เพื่อปักหมุดจุดนัดหมายของทีม</Text>
        {!isTripOwner ? <Text style={styles.ownerOnlyText}>เฉพาะคนสร้างทริปเท่านั้นที่สามารถปัก/ยกเลิกหมุดได้</Text> : null}
        <Text style={styles.hintText}>{selectedAddress || meetingPointAddress || 'ยังไม่มีจุดนัดหมาย'}</Text>
      </View>

      <View style={styles.mapCard}>
        <MapView
          style={{ flex: 1, width: '100%' }}
          initialRegion={initialRegion}
          onPress={(event) => {
            void handleMapPress(event);
          }}
        >
          {activePoint ? (
            <>
              <Circle
                center={activePoint}
                radius={160}
                strokeColor="rgba(246, 200, 10, 0.65)"
                strokeWidth={2}
                fillColor="rgba(246, 200, 10, 0.18)"
              />
              <Circle
                center={activePoint}
                radius={90}
                strokeColor="rgba(246, 200, 10, 0.95)"
                strokeWidth={2}
                fillColor="rgba(246, 200, 10, 0.30)"
              />
              <Marker
                coordinate={activePoint}
                title="Meeting Point"
                description={selectedAddress || meetingPointAddress || 'จุดรวมพลของทริป'}
                pinColor="#F6C80A"
              />
            </>
          ) : null}
        </MapView>
      </View>

      {isTripOwner ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => { void handleSaveMeetingPoint(); }}>
            <Text style={styles.saveBtnText}>📌 ปักหมุดจุดนัดหมาย</Text>
          </TouchableOpacity>

          {canCancelMeetingPoint ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { void handleClearMeetingPoint(); }}>
              <Text style={styles.cancelBtnText}>ยกเลิก Meeting Point</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>กลับไปแผนที่ทริป</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default MeetingPointScreen;