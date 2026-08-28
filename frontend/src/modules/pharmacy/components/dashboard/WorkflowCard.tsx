import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "../../constants/colors";
import Fonts from "../../constants/fonts";
import Spacing from "../../constants/spacing";

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
}

const WorkflowCard = ({
  title,
  icon,
  iconColor,
  onPress,
}: Props) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Ionicons
        name={icon}
        size={26}
        color={iconColor}
      />

      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
};

export default WorkflowCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    width: "47%",
    borderRadius: Spacing.radiusLarge,
    paddingVertical: 20,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,

    marginBottom: Spacing.md,
  },

  title: {
    marginTop: 10,
    fontSize: Fonts.caption,
    color: Colors.text,
    textAlign: "center",
  },
});