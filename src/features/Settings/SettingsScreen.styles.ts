import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, marginTop: 16, textTransform: 'uppercase' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#007AFF', marginRight: 12, marginTop: 2 },
  radioSelected: { backgroundColor: '#007AFF' },
  radioLabel: { fontSize: 15, color: '#333' },
  radioSub: { fontSize: 12, color: '#999', marginTop: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  leaveBtn: { marginTop: 30, backgroundColor: '#FDECEA', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D9534F' },
  leaveBtnText: { color: '#D9534F', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: '#1A1A2E',
    padding: 16,
    borderRadius: 12,
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
