import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeRoute() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Wealth Sandbox
      </Text>
      <Text style={styles.body}>Frontend worktree baseline is ready.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: '#475569',
    fontSize: 16,
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '700',
  },
});
