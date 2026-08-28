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
  rank: number;
  name: string;
  count: string;
}

export default function MedicineItem({
  rank,
  name,
  count,
}: Props) {

  const getMedal = () => {
    switch (rank) {
      case 1:
        return {
          icon: "trophy",
          color: "#FBBF24",
          bg: "#FEF3C7",
        };

      case 2:
        return {
          icon: "medal",
          color: "#9CA3AF",
          bg: "#F3F4F6",
        };

      case 3:
        return {
          icon: "ribbon",
          color: "#D97706",
          bg: "#FFEDD5",
        };

      default:
        return {
          icon: "medical",
          color: Colors.primary,
          bg: "#EAFBF8",
        };
    }
  };

  const medal = getMedal();
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

      <View style={styles.leftSection}>

        <View
          style={[
            styles.rankCircle,
            {
              backgroundColor: medal.bg,
            },
          ]}
        >

          <Ionicons
            name={medal.icon as any}
            size={22}
            color={medal.color}
          />

        </View>

        <View>
<Text
  style={[
    styles.name,
    {
      color: theme.colors.text,
    },
  ]}
>
            {name}
          </Text>

         <Text
  style={[
    styles.subtitle,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            Most Dispensed
          </Text>

        </View>

      </View>

      <View style={[styles.countBadge, { backgroundColor: theme.colors.primary }]}>

        <Text style={[styles.count, { color: "#FFFFFF" }]}>
          {count}
        </Text>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {

    borderRadius: 20,
    marginLeft:16,
    marginRight:16,
    paddingHorizontal: 18,
    paddingVertical: 16,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  rankCircle: {
    width: 50,
    height: 50,

    borderRadius: 25,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 15,
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
   
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
   
  },

  countBadge: {
  

    borderRadius: 18,

    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  count: {
   
    fontWeight: "700",
    fontSize: 13,
  },

});