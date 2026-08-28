import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import Colors from "../../constants/colors";

interface Props {
  title: string;
  value: string;
  icon: any;
  danger?: boolean;
}

export default function OverviewCard({
  title,
  value,
  icon,
  danger,
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

      <View
  style={[
    styles.iconContainer,
    {
      backgroundColor: danger
        ? "#FFF1F2"
        : theme.colors.iconBackground,
    },
  ]}
>
      <Ionicons
  name={icon}
  size={24}
  color={danger ? "#EF4444" : theme.colors.primary}
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
    height:"80%",
   

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
    width: 52,
    height: 52,

    borderRadius: 26,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 18,
  },

  value: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom:15,
   
  },

  title: {
    marginTop: 2,
    marginBottom:18,
    fontSize: 14,

    fontWeight: "600",
  },
});