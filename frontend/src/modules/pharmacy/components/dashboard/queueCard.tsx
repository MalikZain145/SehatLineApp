import React from "react";
import {
  View,
  Text,
 StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "../../constants/colors";

interface Props {
  cardNo: string;
  patientName: string;
  status: "Waiting" | "Preparing" | "Ready";
  waitTime: string;
  onPress?: () => void;
}

export default function QueueCard({
  cardNo,
  patientName,
  status,
  waitTime,
  onPress,
}: Props) {
  const getStatusColor = () => {
    switch (status) {
      case "Waiting":
        return "#F59E0B";

      case "Preparing":
        return "#3B82F6";

      case "Ready":
        return "#22C55E";

      default:
        return Colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={onPress}
    >
      {/* Left Avatar */}
      <View style={styles.avatar}>
        <Ionicons
          name="person-outline"
          size={26}
          color={Colors.primary}
        />
      </View>

      {/* Center Content */}
      <View style={styles.content}>

        <Text style={styles.name}>
          {patientName}
        </Text>

        <Text style={styles.cardNo}>
          Card #{cardNo}
        </Text>

        <View style={styles.bottomRow}>

          <View style={styles.timeRow}>
            <Ionicons
              name="time-outline"
              size={15}
              color={Colors.primary}
            />

            <Text style={styles.time}>
              {waitTime}
            </Text>
          </View>

          <View
            style={[
              styles.status,
              {
                backgroundColor:
                  getStatusColor() + "20",
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

      </View>

      {/* Arrow */}
      <Ionicons
        name="chevron-forward"
        size={22}
        color="#B0B0B0"
      />

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  card: {

    backgroundColor: Colors.white,

    borderRadius: 20,

    padding: 16,

    flexDirection: "row",

    alignItems: "center",

    marginBottom: 14,

    shadowColor: "#000",

    shadowOpacity: 0.05,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  avatar: {

    width: 54,

    height: 54,

    borderRadius: 27,

    backgroundColor: "#E9FBF7",

    justifyContent: "center",

    alignItems: "center",

    marginRight: 14,
  },

  content: {
    flex: 1,
  },

  name: {

    fontSize: 17,

    fontWeight: "700",

    color: Colors.text,
  },

  cardNo: {

    marginTop: 3,

    color: Colors.textSecondary,

    fontSize: 13,
  },

  bottomRow: {

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginTop: 12,
  },

  timeRow: {

    flexDirection: "row",

    alignItems: "center",
  },

  time: {

    marginLeft: 6,

    color: Colors.primary,

    fontWeight: "600",

    fontSize: 13,
  },

  status: {

    paddingHorizontal: 12,

    paddingVertical: 5,

    borderRadius: 12,
  },

  statusText: {

    fontWeight: "700",

    fontSize: 12,
  },

});