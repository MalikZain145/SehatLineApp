import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  medicine: {
    id: string;
    name: string;
    category: string;
    strength?: string;
    stock: number;
    expiry: string;
    status: string;
  };
  onPress: () => void;   // tap the card body → open details
  onEdit: () => void;    // pencil icon
  onDelete: () => void;  // trash icon
}

export default function MedicineCard({ medicine, onPress, onEdit, onDelete }: Props) {
  const { theme } = useTheme();

  const statusColor =
    medicine.status === "In Stock"
      ? "#22C55E"
      : medicine.status === "Low Stock"
      ? "#F59E0B"
      : medicine.status === "Out of Stock"
      ? "#EF4444"
      : Colors.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.card }]}
    >
      <View style={styles.row}>
        {/* Left: name + major details */}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{medicine.name}</Text>
          <Text style={[styles.category, { color: theme.colors.textSecondary }]}>
            {medicine.strength ? `${medicine.strength} · ` : ""}{medicine.category}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={17} color={theme.colors.primary} />
            <Text style={[styles.info, { color: theme.colors.text }]}>Stock: {medicine.stock}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={17} color="#F59E0B" />
            <Text style={[styles.info, { color: theme.colors.text }]}>Expiry: {medicine.expiry || "—"}</Text>
          </View>
        </View>

        {/* Right: status badge on top, edit + delete stacked under it */}
        <View style={styles.rightCol}>
          <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{medicine.status}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.colors.primary + "18" }]}
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: "#EF444418" }]}
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 18, marginTop: 18, elevation: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { fontSize: 18, fontWeight: "700" },
  category: { marginTop: 4, fontSize: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  info: { marginLeft: 10, fontSize: 15 },
  rightCol: { alignItems: "center", marginLeft: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontWeight: "700", fontSize: 12 },
  actions: { marginTop: 14, alignItems: "center", gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center",
  },
});
