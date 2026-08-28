import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from "react-native";

import SideMenu from "../components/profile/sideMenu";
import { useNavigation } from "@react-navigation/native";
import Colors from "../constants/colors";
import AppHeader from "../components/common/AppHeader";
import { useTheme } from "../Theme/themeContext";
import StatCard from "../components/dashboard/statCard";
import ActionCard from "../components/dashboard/actionCard";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getDashboard();
      if (res?.stats) setStats(res.stats);
    } catch (e) {
      // offline
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubFocus = navigation.addListener("focus", load);
    const unsub = onPharmacyUpdate(() => load());
    return () => {
      unsubFocus && unsubFocus();
      unsub && unsub();
    };
  }, [load, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={{ backgroundColor: theme.colors.background }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressViewOffset={80}
          />
        }
      >
        <AppHeader onMenuPress={() => setMenuVisible(true)} />

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard title="Waiting" count={stats.waiting ?? 0} icon="time-outline" iconColor="#F59E0B" />
          <StatCard title="Preparing" count={stats.preparing ?? 0} icon="flask-outline" iconColor="#3B82F6" />
          <StatCard title="Ready Pickup" count={stats.ready ?? 0} icon="checkmark-circle-outline" iconColor="#22C55E" />
          <StatCard title="Dispensed Today" count={stats.dispensedToday ?? 0} icon="medkit-outline" iconColor="#0BAA9D" />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Inventory Status</Text>
        <View style={styles.statsGrid}>
          <StatCard title="In Stock" count={stats.inStock ?? 0} icon="cube-outline" iconColor="#22C55E" />
          <StatCard title="Low Stock" count={stats.lowStock ?? 0} icon="alert-circle-outline" iconColor="#F59E0B" />
          <StatCard title="Out of Stock" count={stats.outOfStock ?? 0} icon="close-circle-outline" iconColor="#EF4444" />
          <StatCard title="Inventory" count={(stats.inStock ?? 0) + (stats.lowStock ?? 0) + (stats.outOfStock ?? 0)} icon="albums-outline" iconColor="#8B5CF6" />
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 22, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 18, marginTop: 10 },
});
