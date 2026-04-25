import maplibregl from 'maplibre-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { reverseGeocode } from '../../core/maps/googleMaps';
import { useAuthStore } from '../../core/store/useAuthStore';
import { useTripStore } from '../../core/store/useTripStore';
import { styles } from './MeetingPointScreen.styles';

const POINT_SOURCE_ID = 'meeting-point-source';
const POINT_LAYER_ID = 'meeting-point-layer';
const HALO_LAYER_ID = 'meeting-point-halo-layer';
const LABEL_LAYER_ID = 'meeting-point-label-layer';

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

const toAddressFallback = (coordinate: { latitude: number; longitude: number }) =>
  `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;

export default function MeetingPointScreen({ navigation }: any) {
  const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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

  const initialCenter = useMemo(() => {
    if (currentUserLocation) {
      return [currentUserLocation.longitude, currentUserLocation.latitude] as [number, number];
    }

    if (meetingPoint) {
      return [meetingPoint.longitude, meetingPoint.latitude] as [number, number];
    }

    return [100.5018, 13.7563] as [number, number];
  }, [currentUserLocation, meetingPoint]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: initialCenter,
      zoom: 13,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource(POINT_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: HALO_LAYER_ID,
        type: 'circle',
        source: POINT_SOURCE_ID,
        paint: {
          'circle-radius': 24,
          'circle-color': '#F6C80A',
          'circle-opacity': 0.25,
        },
      });

      map.addLayer({
        id: POINT_LAYER_ID,
        type: 'circle',
        source: POINT_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': '#F6C80A',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: POINT_SOURCE_ID,
        layout: {
          'text-field': ['coalesce', ['get', 'label'], ''],
          'text-size': 12,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#7A5A00',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 1,
        },
      });
    });

    map.on('click', (event) => {
      if (!isTripOwner) {
        return;
      }

      const coordinate = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };

      setSelectedPoint(coordinate);

      reverseGeocode(coordinate)
        .then((address) => {
          setSelectedAddress(address);
        })
        .catch(() => {
          setSelectedAddress(toAddressFallback(coordinate));
        });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter, isTripOwner]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const activePoint = selectedPoint || meetingPoint;
    if (!activePoint) {
      return;
    }

    const pointsSource = map.getSource(POINT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    pointsSource?.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [activePoint.longitude, activePoint.latitude],
          },
          properties: {
            label: 'Meeting Point',
          },
        },
      ],
    } as GeoJSON.FeatureCollection);

    map.easeTo({
      center: [activePoint.longitude, activePoint.latitude],
      zoom: 15,
      duration: 500,
    });
  }, [meetingPoint, selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded() || !currentUserLocation || selectedPoint) {
      return;
    }

    map.easeTo({
      center: [currentUserLocation.longitude, currentUserLocation.latitude],
      zoom: 15,
      duration: 450,
    });
  }, [currentUserLocation, selectedPoint]);

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

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        padding: '18px 12px',
        boxSizing: 'border-box',
        background: 'radial-gradient(120% 120% at 20% 0%, #1f2937 0%, #0b1220 58%, #040712 100%)',
      }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>📍 Meeting Point</Text>
          <Text style={styles.subtitle}>แตะบนแผนที่เพื่อปักหมุดจุดนัดหมายของทีม</Text>
          {!isTripOwner ? <Text style={styles.ownerOnlyText}>เฉพาะคนสร้างทริปเท่านั้นที่สามารถปัก/ยกเลิกหมุดได้</Text> : null}
          <Text style={styles.hintText}>
            {selectedAddress || meetingPointAddress || 'ยังไม่มีจุดนัดหมาย'}
          </Text>
        </View>

        <View style={styles.mapCard}>
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: '#E8EEF8',
            }}
          />
          <View pointerEvents="none" style={styles.mapInfoPill}>
            <Text style={styles.mapInfoText}>แตะบนแผนที่เพื่อเลือกตำแหน่งจุดนัดหมาย</Text>
          </View>
        </View>

        {isTripOwner ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMeetingPoint} activeOpacity={0.82}>
              <Text style={styles.saveBtnText}>📌 ปักหมุดจุดนัดหมาย</Text>
            </TouchableOpacity>
            {canCancelMeetingPoint ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClearMeetingPoint} activeOpacity={0.85}>
                <Text style={styles.cancelBtnText}>ยกเลิกหมุด</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </SafeAreaView>
    </div>
  );
}
