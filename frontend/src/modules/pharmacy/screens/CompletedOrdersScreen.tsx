import React, { useState, useEffect, useCallback } from "react";
import { SkeletonList, SkeletonScreen } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import CompleteOrder from "../components/completed/completeOrder";
import GradientHeader from "../components/common/GradientHeader";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { onPharmacyUpdate } from "../../../services/socket";
import { pharmAlert } from "../components/common/PharmAlert";

export default function CompletedOrdersScreen() {
  const [search, setSearch] = useState("");
  const { theme } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useMinLoading(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const runBackup = useCallback(async () => {
    setBackingUp(true);
    try {
      const res = await pharmacyService.createBackup();
      pharmAlert(
        "Backup Saved",
        `${res?.count ?? 0} dispensed record(s) saved to a formatted Excel sheet (${res?.fileName || "pharmacy backup"}).\n\nAn automatic backup also runs every day at 2:00 PM when the hospital closes.`
      );
    } catch (e: any) {
      pharmAlert("Backup Failed", e?.message || "Could not create the backup.");
    } finally {
      setBackingUp(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await pharmacyService.getCompleted();
      setOrders(res?.orders || []);
    } catch (e) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = onPharmacyUpdate(() => load());
    return () => unsub && unsub();
  }, [load]);

  const filtered = orders.filter(
    (item) =>
      item.patientName.toLowerCase().includes(search.toLowerCase()) ||
      String(item.cardNo).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Completed Orders" subtitle="Successfully delivered medicines" />

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
          />
        }
      >
        <TextInput
          placeholder="Search patient or card number"
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[styles.search, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
        />

        <TouchableOpacity
          style={[styles.backupBtn, { backgroundColor: theme.colors.primary, opacity: backingUp ? 0.7 : 1 }]}
          onPress={runBackup}
          disabled={backingUp}
          activeOpacity={0.85}
        >
          {backingUp ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.backupBtnText}>Backup Today's Records (Excel)</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 18, textAlign: "center" }}>
          Auto-backup runs daily at 2:00 PM · Doctor, card no. & medicines recorded
        </Text>

        {loading ? (
          <SkeletonList count={5} dark={theme.dark} />
        ) : filtered.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: theme.colors.textSecondary }}>
            No completed orders yet.
          </Text>
        ) : (
          filtered.map((item) => (
            <CompleteOrder
              key={item.id}
              patientName={item.patientName}
              cardNumber={item.cardNo}
              collectedTime={item.collectedTime || "Just now"}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 30 },
  search: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 20, fontSize: 16, elevation: 2, borderWidth: 1 },
  backupBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, paddingVertical: 14, marginBottom: 8, elevation: 2,
  },
  backupBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
