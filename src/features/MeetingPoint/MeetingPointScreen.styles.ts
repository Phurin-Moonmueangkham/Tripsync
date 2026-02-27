import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  mapPlaceholder: { flex: 1, backgroundColor: '#D4E8C2', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  mapText: { fontSize: 18, color: '#555', position: 'absolute', top: 16 },
  pinContainer: { alignItems: 'center' },
  pin: { fontSize: 40 },
  pinLabel: { backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontWeight: '600', marginTop: 4 },
  saveBtn: { backgroundColor: '#2ECC71', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
