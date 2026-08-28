import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  cardNo: string;
  patientName: string;
  doctorName: string;
  status: "Waiting" | "Ready";
  time: string;
  onPress?: () => void;
}

export default function QueuePatientCard({
  cardNo,
  patientName,
  doctorName,
  status,
  time,
  onPress,
}: Props) {
  const getStatusColor = () => {
    switch (status) {
      case "Waiting":
        return "#F59E0B";
      default:
        return Colors.textSecondary;
    }  };
  const { theme } = useTheme();

  return (
  <View
    style={[
      styles.card,
      {
        backgroundColor: theme.colors.card,
      },
    ]}
  >
    <View style={styles.topRow}>
      <View>
        <Text
          style={[
            styles.cardNo,
            {
              color: theme.colors.text,
            },
          ]}
        >
          Card #{cardNo}
        </Text>

        <Text
          style={[
            styles.patient,
            {
              color: theme.colors.text,
            },
          ]}
        >
          {patientName}
        </Text>
      </View>
    </View>

    <View style={styles.infoRow}>
      <Ionicons
        name="person"
        size={16}
        color={theme.colors.primary}
      />

      <Text
        style={[
          styles.infoText,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        Dr. {doctorName}
      </Text>
    </View>

    <View style={styles.infoRow}>
      <Ionicons
        name="time"
        size={16}
        color={theme.colors.danger}
      />

      <Text
        style={[
          styles.infoText,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        {time}
      </Text>
    </View>

    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.warning,
        },
      ]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>
        View Prescription
      </Text>
    </TouchableOpacity>

  </View>
);
}

const styles = StyleSheet.create({
  card: {
    
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardNo: {
    fontWeight: "700",
    fontSize: 15,
    
  },

  patient: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: "600",
  },

  

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  infoText: {
    marginLeft: 8,
    
  },

button: {
  marginTop: 16,
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: "center",
},

  buttonText: {
    
    fontWeight: "700",
    fontSize: 15,
  },
});