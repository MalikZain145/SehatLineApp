import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  label?: string;
  value: string; // 'MM/YYYY'
  onChange: (value: string) => void;
}

// Parse 'MM/YYYY' back into a Date (1st of that month) for the picker's initial value.
function toDate(value: string): Date {
  const m = /^(\d{1,2})\s*\/\s*(\d{4})$/.exec((value || "").trim());
  if (m) {
    const month = Math.min(12, Math.max(1, Number(m[1]))) - 1;
    return new Date(Number(m[2]), month, 1);
  }
  const d = new Date();
  return new Date(d.getFullYear() + 1, d.getMonth(), 1); // default: +1 year
}

function fmt(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ExpiryPicker({ label = "Expiry Date", value, onChange }: Props) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);

  return (
    <View>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShow(true)}
        style={[styles.field, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
          {value || "Select month / year"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "calendar"}
          minimumDate={new Date()}
          onChange={(event: any, selected?: Date) => {
            // Android fires onChange then closes; iOS keeps the spinner open.
            if (Platform.OS === "android") setShow(false);
            if (event?.type === "dismissed") return;
            if (selected) onChange(fmt(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  field: {
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 2,
  },
});
