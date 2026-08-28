import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useTheme } from "../../Theme/themeContext";

interface Props {
  question: string;
  answer: string;
}

export default function FAQItem({
  question,
  answer,
}: Props) {
  const { theme } = useTheme();

  const [expanded, setExpanded] = useState(false);

  return (
    <View
  style={[
    styles.container,
    {
      backgroundColor: theme.colors.card,
    },
  ]}
>

      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <Text
  style={[
    styles.question,
    {
      color: theme.colors.text,
    },
  ]}
>
          {question}
        </Text>

        <Ionicons
          name={
            expanded
              ? "chevron-up"
              : "chevron-down"
          }
          size={22}
          color={theme.colors.primary}
        />
      </TouchableOpacity>

      {expanded && (
        <Text
  style={[
    styles.answer,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
          {answer}
        </Text>
      )}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
   
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
   
    paddingRight: 10,
  },

  answer: {
    marginTop: 12,
    fontSize: 14,
  
    lineHeight: 22,
  },

});