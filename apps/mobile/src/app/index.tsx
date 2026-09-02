import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SimulationScreen } from '../features/simulation';
import { OrderScreen } from '../features/order';
import { MarketScreen } from '../features/market';
import { SettingsScreen } from '../features/settings';
import { WealthDashboardScreen } from '../features/wealth';

export default function HomeRoute() {
  const [section, setSection] = useState<
    'market' | 'order' | 'settings' | 'simulation' | 'wealth'
  >('wealth');
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
          accessibilityState={{ selected: section === 'market' }}
          onPress={() => setSection('market')}
          style={styles.tab}
        >
          <Text style={styles.tabText}>시장</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'order' }}
          onPress={() => setSection('order')}
          style={styles.tab}
        >
          <Text style={styles.tabText}>주문</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'simulation' }}
          onPress={() => setSection('simulation')}
          style={styles.tab}
        >
          <Text style={styles.tabText}>시뮬레이션</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: section === 'settings' }}
          onPress={() => setSection('settings')}
          style={styles.tab}
        >
          <Text style={styles.tabText}>설정</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        {section === 'wealth' ? (
          <WealthDashboardScreen />
        ) : section === 'market' ? (
          <MarketScreen />
        ) : section === 'simulation' ? (
          <SimulationScreen />
        ) : section === 'order' ? (
          <OrderScreen />
        ) : (
          <SettingsScreen />
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
