import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  icon: any;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

export default function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  showSwitch = false,
  switchValue = false,
  onSwitchChange,
}: Props) {
  const { theme } = useTheme();
  return (
  <TouchableOpacity
    activeOpacity={0.8}
    style={[
      styles.card,
      {
        backgroundColor: theme.colors.card,
      },
    ]}
    onPress={onPress}
    disabled={showSwitch}
  >
    <View style={styles.left}>

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
          size={22}
          color={theme.colors.primary}
        />
      </View>

      <View style={styles.textContainer}>

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

        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}

      </View>

    </View>

    {showSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{
          false: "#D1D5DB",
          true: theme.colors.primary,
        }}
        thumbColor="#FFFFFF"
      />
    ) : (
      showArrow && (
        <Ionicons
          name="chevron-forward"
          size={22}
          color={theme.colors.textSecondary}
        />
      )
    )}
  </TouchableOpacity>
);
}

const styles = StyleSheet.create({
  card: {
   
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    
    justifyContent: "center",
    alignItems: "center",
  },

  textContainer: {
    marginLeft: 14,
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
   
  },
});