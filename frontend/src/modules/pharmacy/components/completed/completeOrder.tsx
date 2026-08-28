import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  patientName: string;
  cardNumber: string;
  collectedTime: string;
}

export default function CompletedOrderCard({
  patientName,
  cardNumber,
  collectedTime,
}: Props) {

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

      <View style={styles.leftSection}>

        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="check-circle"
            size={34}
            color="#22C55E"
          />
        </View>

        <View style={styles.info}>
          <Text
  style={[
    styles.name,
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
            Card #{cardNumber}
          </Text>
<Text
  style={[
    styles.time,
    {
      color: theme.colors.primary,
    },
  ]}
>
            Collected at {collectedTime}
          </Text>
        </View>

      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          Completed
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
   
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 28,
   
    justifyContent: "center",
    alignItems: "center",
  },

  info: {
    marginLeft: 15,
    flex: 1,
  },

  name: {
    fontSize: 17,
    
  },

  cardNo: {
    marginTop: 4,
   
    fontSize: 14,
  },

  time: {
    marginTop: 6,
   
    fontWeight: "600",
    fontSize: 13,
  },

  badge: {
    
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  badgeText: {
  
    fontWeight: "700",
    fontSize: 12,
  },
});