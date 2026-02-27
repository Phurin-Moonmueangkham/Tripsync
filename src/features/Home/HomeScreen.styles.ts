import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { alignItems: 'center', paddingTop: 40, paddingBottom: 10 },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  illustrationContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  illustration: { fontSize: 80 },
  buttonContainer: { paddingHorizontal: 30, paddingBottom: 20 },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#007AFF' },
  secondaryButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 36,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 13, color: '#666', marginTop: 2 },
});
