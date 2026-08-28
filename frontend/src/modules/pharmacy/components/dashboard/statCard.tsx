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
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

export default function StatCard({
  title,
  count,
  icon,
  iconColor,
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
            backgroundColor: theme.colors.iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={iconColor}
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
    width: "45%",
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 14,
  },

  count: {
    fontSize: 22,
    fontWeight: "700",
  },

  title: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

});