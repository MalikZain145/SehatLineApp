import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import Colors from "../../constants/colors";

interface FilterChipProps {
  title: string;
  active: boolean;
  onPress?: () => void;
}

const FilterChip = ({
  title,
  active,
  onPress,
}: FilterChipProps) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && styles.activeChip,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          active && styles.activeText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default FilterChip;

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderRadius: 25,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },

  activeChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  text: {
    color: Colors.text,
    fontWeight: "600",
  },

  activeText: {
    color: Colors.white,
  },
});