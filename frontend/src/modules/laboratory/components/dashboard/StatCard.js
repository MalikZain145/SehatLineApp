import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";

export default function StatCard({
  title,
  count,
  icon,
  iconColor,
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: theme.colors.primaryLight,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={iconColor || theme.colors.primary}
        />
      </View>

      <Text
        style={[
          styles.count,
          {
            color: theme.colors.text,
          },
        ]}
      >
        {count}
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
    width: "48%",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,

    borderWidth: 1,

    elevation: 2,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 12,
  },

  count: {
    fontSize: 26,
    fontWeight: "800",
  },

  title: {
    fontSize: 13,
    marginTop: 3,
  },
});