import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";

const CATEGORIES = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Drops",
  "Inhaler",
  "Ointment",
  "Cream",
  "Sachet",
  "Other",
];

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  placeholder?: string;
}

export default function CategoryPicker({ label = "Category *", value, onChange, options, placeholder = "Select category" }: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const items = options && options.length ? options : CATEGORIES;

  return (
    <View>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      >
        <Text style={{ color: value ? theme.colors.text : theme.colors.textSecondary, fontSize: 16 }}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{label.replace(" *","")}</Text>
            <FlatList
              data={items}
              keyExtractor={(i) => i}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[styles.row, { borderBottomColor: theme.colors.border }]}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: selected ? "700" : "400" }}>
                      {item}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  field: {
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 2,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 30 },
  sheet: { borderRadius: 20, paddingVertical: 10, maxHeight: "70%", elevation: 8 },
  sheetTitle: { fontSize: 17, fontWeight: "800", paddingHorizontal: 20, paddingVertical: 14 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
});
