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
  counter: number;
  time: string;
}

export default function NotificationCard({
  patientName,
  cardNumber,
  counter,
  time,
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
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
  name="bell-ring"
  size={28}
  color={theme.colors.primary}
/>
      </View>

      <View style={styles.info}>
       <Text
  style={[
    styles.title,
    {
      color: theme.colors.text,
    },
  ]}
>
          Medicine Ready
        </Text>

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
    styles.details,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
          Card #{cardNumber}
        </Text>

       <Text
  style={[
    styles.details,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
          Counter {counter}
        </Text>
      </View>

      <Text style={styles.time}>
        {time}
      </Text>
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
    alignItems: "center",
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
   
    justifyContent: "center",
    alignItems: "center",
  },

  info: {
    flex: 1,
    marginLeft: 15,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    
  },

  name: {
    marginTop: 4,
    fontSize: 15,
    
  },

  details: {
    marginTop: 2,
    
    fontSize: 13,
  },

  time: {
    
    fontWeight: "700",
    fontSize: 13,
  },
});