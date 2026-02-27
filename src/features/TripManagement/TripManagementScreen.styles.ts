import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 24 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#1A1A2E', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 18, letterSpacing: 4, marginBottom: 16, textAlign: 'center' },
  joinBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  joinBtnDisabled: { opacity: 0.7 },
  joinBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#D9534F', marginBottom: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#ddd' },
  orText: { marginHorizontal: 12, color: '#999' },
  createBtn: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#007AFF' },
  createBtnText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
});
