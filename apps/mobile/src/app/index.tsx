import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SimulationScreen } from '../features/simulation';
import { WealthDashboardScreen } from '../features/wealth';

export default function HomeRoute() {
  const [section, setSection] = useState<'simulation' | 'wealth'>('wealth');
  return (
    <View style={styles.shell}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'wealth' }}
          onPress={() => setSection('wealth')}
          style={styles.tab}
        >
          <Text style={styles.tabText}>자산</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'simulation' }}
          onPress={() => setSection('simulation')}
          style={styles.tab}
        >
          <Text style={styles.tabText}>시뮬레이션</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        {section === 'wealth' ? (
          <WealthDashboardScreen />
        ) : (
          <SimulationScreen />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  shell: { backgroundColor: '#07111f', flex: 1 },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  tabText: { color: '#d9e3ef', fontSize: 13, fontWeight: '800' },
  tabs: {
    backgroundColor: '#101d2e',
    borderBottomColor: '#22334a',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingTop: 36,
  },
});
