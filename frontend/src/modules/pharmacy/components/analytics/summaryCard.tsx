import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import Colors from "../../constants/colors";

interface Props {
  title: string;
  value: string;
}

export default function SummaryCard({
  title,
  value,
}: Props) {

  const getIcon = () => {
    switch (title) {
      case "Patients":
        return "people-outline";

      case "Peak Hour":
        return "time-outline";

      case "Fastest":
        return "flash-outline";

      case "Avg Wait":
        return "hourglass-outline";

      default:
        return "analytics-outline";
    }
  };
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

     <View
  style={[
    styles.iconContainer,
    {
      backgroundColor: theme.colors.iconBackground,
    },
  ]}
>
      <Ionicons
  name={getIcon() as any}
  size={22}
  color={theme.colors.primary}
/>
      </View>

      <Text
  style={[
    styles.value,
    {
      color: theme.colors.text,
    },
  ]}
>
        {value}
      </Text>

     <Text
  style={[
    styles.title,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
        {title}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    width: "46%",
    height:"44%",


    borderRadius: 20,

    paddingVertical: 22,
    paddingHorizontal: 18,

    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  iconContainer: {
    width: 48,
    height: 48,

    borderRadius: 24,

  

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 16,
  },

  value: {
    fontSize: 22,
    fontWeight: "700",
   
  },

  title: {
    marginTop: 5,

    fontSize: 12,
    fontWeight: "600",

    
  },

});