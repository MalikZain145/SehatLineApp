import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";

export default function QueueCard({
  patientName,
  cardNo,
  testName,
  doctorName,
  status,
  time,
  onPress,
}) {
  const { theme } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case "Waiting":
        return theme.colors.warning;

      case "Sample Collected":
        return theme.colors.blue;

      case "Processing":
        return theme.colors.primary;

      case "Completed":
        return theme.colors.success;

      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>

        <View style={styles.patientSection}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={22}
              color={theme.colors.primary}
            />
          </View>

          <View style={styles.patientInfo}>
            <Text
              style={[
                styles.patientName,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              {patientName}
            </Text>

            <Text
              style={[
                styles.cardNo,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              Card #{cardNo}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${getStatusColor()}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: getStatusColor(),
              },
            ]}
          >
            {status}
          </Text>
        </View>

      </View>

      <View
        style={[
          styles.divider,
          {
            backgroundColor: theme.colors.divider,
          },
        ]}
      />

      <View style={styles.detailsRow}>

        <View style={styles.detail}>
          <Ionicons
            name="flask-outline"
            size={17}
            color={theme.colors.primary}
          />

          <Text
            style={[
              styles.detailText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {testName}
          </Text>
        </View>

        <View style={styles.detail}>
          <Ionicons
            name="time-outline"
            size={17}
            color={theme.colors.primary}
          />

          <Text
            style={[
              styles.detailText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {time}
          </Text>
        </View>

      </View>

      <Text
        style={[
          styles.doctor,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        Referred by: {doctorName}
      </Text>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,

    padding: 16,

    marginBottom: 14,

    borderWidth: 1,

    elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  patientSection: {
    flexDirection: "row",
    alignItems: "center",

    flex: 1,
  },

  iconContainer: {
    width: 44,
    height: 44,

    borderRadius: 14,

    justifyContent: "center",
    alignItems: "center",
  },

  patientInfo: {
    marginLeft: 11,
    flex: 1,
  },

  patientName: {
    fontSize: 16,
    fontWeight: "700",
  },

  cardNo: {
    fontSize: 13,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    marginVertical: 13,
  },

  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detail: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  detailText: {
    fontSize: 13,
    marginLeft: 6,
  },

  doctor: {
    fontSize: 12,
    marginTop: 10,
  },
});