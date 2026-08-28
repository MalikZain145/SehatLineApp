import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import Colors from "../../constants/colors";

interface Props {
  icon: any;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

export default function SupportCard({
  icon,
  title,
    subtitle,
  onPress,
}: Props) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
     
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.card,
    },
  ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.leftSection}>

      <View
  style={[
    styles.iconContainer,
    {
      backgroundColor: theme.colors.primary + "20",
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

      <Ionicons
        name="chevron-forward"
        size={22}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
card: {
    
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: 16,

    elevation: 3,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
   textContainer: {
  flex: 1,
},

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,

    

    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
   
    flex: 1,
  },
  subtitle: {
  fontSize: 13,
 
  marginTop: 4,
},

});