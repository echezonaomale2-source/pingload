import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../utils/colors';

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crash:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const message = this.state.error?.message || String(this.state.error);

    return (
      <View style={styles.container}>
        <Text style={styles.title}>App failed to start</Text>
        <Text style={styles.subtitle}>Share this error if you need help:</Text>
        <ScrollView style={styles.box} contentContainerStyle={styles.boxContent}>
          <Text style={styles.message}>{message}</Text>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  box: {
    maxHeight: 280,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  boxContent: { padding: 16 },
  message: { fontSize: 13, color: colors.error, lineHeight: 20 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});

export default ErrorBoundary;
