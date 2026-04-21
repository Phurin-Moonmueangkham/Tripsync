import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 30 },
  alertBox: { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#4B5563', shadowColor: '#111827', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  alertIcon: { fontSize: 50, marginBottom: 12 },
  alertTitle: { fontSize: 22, fontWeight: 'bold', color: '#D9534F', textAlign: 'center', marginBottom: 8 },
  alertSub: { fontSize: 14, color: '#D1D5DB', textAlign: 'center' },
  navigateBtn: { backgroundColor: '#D9534F', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  navigateBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  dismissBtn: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#9CA3AF', backgroundColor: 'rgba(31, 41, 55, 0.82)' },
  dismissBtnText: { color: '#D9534F', fontSize: 15, fontWeight: '600' },
});
