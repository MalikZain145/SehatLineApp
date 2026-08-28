import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";


  export default function SearchBar() {

  const { theme } = useTheme();

  return (
    <View
  style={[
    styles.container,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
      <Ionicons
        name="search-outline"
        size={22}
       color={theme.colors.primary}
        style={styles.icon}
      />

      <TextInput
        placeholder="Search patient by Card No. or Name"
       placeholderTextColor={theme.colors.textSecondary}
       style={[
  styles.input,
  {
    color: theme.colors.text,
  },
]}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {

    height: 50,

    borderRadius: 30,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 16,
    marginTop: 8,

    marginBottom: 28,

    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  icon: {
    marginRight: 12,
  },

  input: {

    flex: 1,

    fontSize: 15,

    fontWeight: "400",

  },

});