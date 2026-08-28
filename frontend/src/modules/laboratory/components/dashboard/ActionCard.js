import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";

export default function ActionCard({
  title,
  icon,
  iconColor,
  onPress,
}) {
  const { theme } = useTheme();

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
          size={25}
          color={iconColor || theme.colors.primary}
        />
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text,
          },
        ]}
      >
        {title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",

    borderRadius: 18,

    padding: 16,

    marginBottom: 14,

    borderWidth: 1,

    flexDirection: "row",
    alignItems: "center",

    elevation: 2,
  },

  iconContainer: {
    width: 42,
    height: 42,

    borderRadius: 13,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 10,
  },

  title: {
    flex: 1,

    fontSize: 14,
    fontWeight: "700",
  },
});