import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  heading: { fontSize: 28, fontWeight: '800', color: '#F3F4F6', marginBottom: 10 },
  label: { fontSize: 14, color: '#D1D5DB', marginBottom: 8 },
  input: { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderWidth: 1, borderColor: '#4B5563', borderRadius: 12, padding: 14, fontSize: 18, letterSpacing: 4, marginBottom: 16, textAlign: 'center', color: '#F3F4F6' },
  joinBtn: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  joinBtnDisabled: { opacity: 0.7 },
  joinBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#D9534F', marginBottom: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#4B5563' },
  orText: { marginHorizontal: 12, color: '#9CA3AF' },
  createBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#4B5563', backgroundColor: 'rgba(31, 41, 55, 0.9)' },
  createBtnText: { color: '#E5E7EB', fontSize: 16, fontWeight: '700' },
});
