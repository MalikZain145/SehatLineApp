// LabAlert — a theme-aware, app-styled replacement for the native Alert.alert.
// Same call signature, so screens just swap `Alert.alert(` → `labAlert(`:
//   labAlert("Title", "Message")
//   labAlert("Title", "Message", [{ text, onPress, style }])
// Mount <LabAlertHost /> ONCE (in LaboratoryPortal) inside the lab ThemeProvider.

import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";

let _handler = null;

// Drop-in for Alert.alert(title, message, buttons).
export function labAlert(title, message, buttons) {
  if (_handler) _handler({ title: title || "", message: message || "", buttons });
  else console.warn("LabAlertHost not mounted");
}

export function LabAlertHost() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [state, setState] = useState({ visible: false, title: "", message: "", buttons: null });

  useEffect(() => {
    _handler = (cfg) => setState({ visible: true, ...cfg });
    return () => { _handler = null; };
  }, []);

  const close = () => setState((s) => ({ ...s, visible: false }));
  const buttons = state.buttons && state.buttons.length ? state.buttons : [{ text: "OK" }];
  const stacked = buttons.length > 2;

  // Pick a header icon from the title tone.
  const t = (state.title || "").toLowerCase();
  const isError = /error|fail|wrong|invalid|required|missing|could not|cannot|delete|remove/.test(t);
  const isSuccess = /success|added|updated|saved|sent|submitted|complete|changed|ready/.test(t);
  const icon = isError ? "alert-circle" : isSuccess ? "checkmark-circle" : "information-circle";
  const iconColor = isError ? (colors.error || "#EF4444") : isSuccess ? (colors.success || "#10B981") : colors.primary;

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + "1A" }]}>
            <Ionicons name={icon} size={30} color={iconColor} />
          </View>

          {!!state.title && <Text style={[styles.title, { color: colors.text }]}>{state.title}</Text>}
          {!!state.message && <Text style={[styles.message, { color: colors.textSecondary }]}>{state.message}</Text>}

          <View style={[styles.actions, { flexDirection: stacked ? "column" : "row" }]}>
            {buttons.map((b, i) => {
              const destructive = b.style === "destructive";
              const cancel = b.style === "cancel";
              const bg = destructive ? (colors.error || "#EF4444") : cancel ? "transparent" : colors.primary;
              const fg = cancel ? colors.textSecondary : "#FFFFFF";
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => { close(); if (b.onPress) setTimeout(b.onPress, 0); }}
                  style={[
                    styles.btn,
                    stacked ? { width: "100%" } : { flex: 1 },
                    { backgroundColor: bg, borderWidth: cancel ? 1.5 : 0, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.btnText, { color: fg }]}>{b.text || "OK"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 30 },
  card: { width: "100%", maxWidth: 380, borderRadius: 22, borderWidth: 1, padding: 22, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  message: { fontSize: 13.5, textAlign: "center", marginTop: 8, lineHeight: 20 },
  actions: { gap: 10, marginTop: 20, alignSelf: "stretch" },
  btn: { paddingVertical: 13, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 14.5, fontWeight: "800" },
});
