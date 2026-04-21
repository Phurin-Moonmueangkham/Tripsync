import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#D1D5DB', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { backgroundColor: 'rgba(31, 41, 55, 0.9)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#4B5563', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#007AFF', marginRight: 12, marginTop: 2, backgroundColor: 'white' },
  radioSelected: { backgroundColor: '#007AFF' },
  radioLabel: { fontSize: 15, color: '#E5E7EB', fontWeight: '600' },
  radioSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: '#E5E7EB', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#4B5563', marginVertical: 10 },
  leaveBtn: { marginTop: 30, backgroundColor: '#FDECEA', paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#D9534F' },
  leaveBtnText: { color: '#D9534F', fontWeight: '700', fontSize: 16 },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: '#1A1A2E',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutBtnDisabled: {
    opacity: 0.7,
  },
  logoutBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
