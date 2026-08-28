import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";

// A themed success/error dialog for the pharmacy module (uses the pharmacy
// theme, so it follows the pharmacist's dark/light choice). Replaces the plain
// native Alert.alert for "Requisition sent", "Report sent", errors, etc.
type Variant = "success" | "error" | "info";
const ICONS: Record<Variant, string> = { success: "checkmark-circle", error: "alert-circle", info: "information-circle" };

export default function ThemedAlert({
  visible,
  variant = "info",
  title,
  message,
  buttonLabel = "OK",
  onClose,
}: {
  visible: boolean;
  variant?: Variant;
  title: string;
  message?: string;
  buttonLabel?: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  // App colour is teal — success/info use the teal primary; only errors are red.
  const accent = variant === "error" ? "#EF4444" : theme.colors.primary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: accent + "1F" }]}>
            <Ionicons name={(ICONS[variant] as any)} size={34} color={accent} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          {!!message && <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>}
          <TouchableOpacity style={[styles.button, { backgroundColor: accent }]} activeOpacity={0.85} onPress={onClose}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  card: { width: "100%", borderRadius: 22, paddingVertical: 26, paddingHorizontal: 22, alignItems: "center" },
  iconWrap: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  message: { fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: 8 },
  button: { marginTop: 22, borderRadius: 14, paddingVertical: 13, alignItems: "center", justifyContent: "center", width: "100%" },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
