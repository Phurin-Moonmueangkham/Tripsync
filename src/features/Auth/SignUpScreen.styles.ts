import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050b18',
    paddingTop: 8,
    paddingBottom: 8,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  darkScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 12, 24, 0.62)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 9, 20, 0.42)',
  },
  ambient: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.18,
  },
  ambientOne: {
    width: 220,
    height: 220,
    top: 60,
    right: -70,
    backgroundColor: '#1ea7a1',
  },
  ambientTwo: {
    width: 180,
    height: 180,
    bottom: 90,
    left: -60,
    backgroundColor: '#ff5f45',
  },
  content: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    zIndex: 1,
    marginHorizontal: 14,
    marginVertical: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.7)',
    backgroundColor: 'rgba(17, 24, 39, 0.82)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  input: {
    backgroundColor: 'rgba(31, 41, 55, 0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#F3F4F6',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 46,
  },
  passwordToggleButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    height: 34,
    width: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggleIcon: {
    fontSize: 18,
  },
  primaryButton: {
    backgroundColor: '#0891B2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#D9534F',
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
  },
});
