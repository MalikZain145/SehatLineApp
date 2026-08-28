import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import Colors from "../../constants/colors";

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress?: () => void;
}

export default function ActionCard({
  title,
  icon,
  iconColor,
  onPress,
}: Props) {

  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
        },
      ]}
      onPress={onPress}
    >

      <View
        style={[
          styles.iconCircle,
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
        size={18}
        color={theme.colors.textSecondary}
        style={styles.arrow}
      />

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({

  card: {
    width: "48%",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 15,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    width: "90%",
  },

  arrow: {
    position: "absolute",
    right: 16,
    top: 18,
  },


});