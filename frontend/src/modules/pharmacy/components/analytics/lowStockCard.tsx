import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  medicine: string;
  stock: string | number;
}

export default function LowStockCard({ medicine, stock }: Props) {
  const { theme } = useTheme();
  const out = Number(stock) <= 0;
  const accent = out ? "#EF4444" : "#F59E0B";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      {/* Name on top — wraps to next line if long, stays inside the card */}
      <Text style={[styles.medicine, { color: theme.colors.text }]}>{medicine}</Text>

      {/* Below: warning + "X left" */}
      <View style={styles.metaRow}>
        <View style={[styles.iconContainer, { backgroundColor: accent + "22" }]}>
          <Ionicons name={out ? "close-circle" : "warning"} size={16} color={accent} />
        </View>
        <Text style={[styles.leftText, { color: accent }]}>
          {Number(stock)} left{out ? " · Out of stock" : " · Low stock"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  medicine: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  iconContainer: {
    width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center", marginRight: 10,
  },
  leftText: { fontSize: 13, fontWeight: "700" },
});
