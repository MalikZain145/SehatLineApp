import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import Colors from "../../constants/colors";

interface Props {
  patientName: string;
  cardNumber: string;
  doctorName: string;
  priority: string;
  totalMedicines: number;
}

export default function PatientSummaryCard({
  patientName,
  cardNumber,
  doctorName,
  priority,
  totalMedicines,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{patientName}</Text>

      <Text style={styles.info}>
        Card No: {cardNumber}
      </Text>

      <Text style={styles.info}>
        Doctor: Dr. {doctorName}
      </Text>

      <Text style={styles.info}>
        Priority: {priority}
      </Text>

      <Text style={styles.info}>
        Medicines: {totalMedicines}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },

  info: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});