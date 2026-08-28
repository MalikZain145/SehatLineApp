import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  patientName: string;
  cardNumber: string;
  counter: string;
  onCancel: () => void;
  onComplete: () => void;
}

export default function CompleteOrderModal({
  visible,
  patientName,
  cardNumber,
  counter,
  onCancel,
  onComplete,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>

        <View style={styles.modal}>

          <Ionicons
            name="checkmark-done-circle"
            size={72}
            color="#0BAA9D"
          />

          <Text style={styles.title}>
            Complete Order
          </Text>

          <Text style={styles.subtitle}>
            Please confirm that the patient
            has received all prescribed
            medicines.
          </Text>

          <View style={styles.infoCard}>

            <View style={styles.infoRow}>
              <Text style={styles.label}>
                Patient
              </Text>

              <Text style={styles.value}>
                {patientName}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>
                Card Number
              </Text>

              <Text style={styles.value}>
                {cardNumber}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>
                Pickup Counter
              </Text>

              <Text style={styles.value}>
                {counter}
              </Text>
            </View>

          </View>

          <View style={styles.buttonRow}>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={onComplete}
            >
              <Text style={styles.completeText}>
                Complete
              </Text>
            </TouchableOpacity>

          </View>

        </View>

      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modal: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 8,
  },

  title: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
  },

  subtitle: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 24,
  },

  infoCard: {
    width: "100%",
    marginTop: 24,
    backgroundColor: "#F8FFFD",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DFFAF5",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  label: {
    fontSize: 15,
    color: "#6B7280",
  },

  value: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 28,
  },

  cancelButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E5E3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  completeButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  cancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },

  completeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

});