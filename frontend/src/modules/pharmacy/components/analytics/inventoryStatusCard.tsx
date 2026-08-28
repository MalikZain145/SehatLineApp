import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import Colors from "../../constants/colors";

interface Props {
  title: string;
  value: string;
  type: "success" | "warning" | "danger";
}

export default function InventoryStatusCard({
  title,
  value,
  type,
}: Props) {
const { theme } = useTheme();
  const getColor = () => {
    switch (type) {
      case "success":
        return "#10B981";

      case "warning":
        return "#F59E0B";

      case "danger":
        return "#EF4444";
    }
  };

  const getBackground = () => {
    switch (type) {
      case "success":
        return "#ECFDF5";

      case "warning":
        return "#FEF3C7";

      case "danger":
        return "#FEF2F2";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";

      case "warning":
        return "warning";

      case "danger":
        return "close-circle";
    }
  };

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
            backgroundColor: getBackground(),
          },
        ]}
      >
        <Ionicons
          name={getIcon() as any}
          size={24}
          color={getColor()}
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
    width: "31%",

    borderRadius: 20,

    paddingVertical: 18,

    alignItems: "center",

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

    marginBottom: 14,
  },

  value: {
    fontSize: 22,
    fontWeight: "700",

  },

  title: {
    marginTop: 5,

    textAlign: "center",

    fontSize: 12,

    

    fontWeight: "600",
  },
});