import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";

export default function EditProfileScreen({
  navigation,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Laboratory");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await laboratoryService.getProfile();
        const u = res?.profile;
        if (u) {
          setName(u.name || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setDepartment(u.department || "Laboratory");
        }
      } catch (e) { /* offline */ }
    })();
  }, []);

  const saveProfile = () => {
    if (!name.trim()) {
      labAlert("Name Required", "Please enter your name.");
      return;
    }
    if (!phone.trim()) {
      labAlert("Phone Required", "Please enter your phone number.");
      return;
    }
    setSaving(true);
    // Email is a locked identity field — only name / phone / department are editable.
    laboratoryService.updateProfile({ name: name.trim(), phone: phone.trim(), department: department.trim() })
      .then(() => {
        labAlert(
          "Profile Updated",
          "Your profile information has been updated successfully.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      })
      .catch((e) => {
        labAlert("Error", e?.message || "Could not update your profile.");
      })
      .finally(() => setSaving(false));
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <GradientHeader title="Edit Profile" />

        {/* PROFILE ICON */}

        

        {/* FULL NAME */}

        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          Full Name
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={19}
            color={colors.primary}
          />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={
              colors.textSecondary
            }
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* EMAIL */}

        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          Email Address
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="mail-outline"
            size={19}
            color={colors.primary}
          />

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={
              colors.textSecondary
            }
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* PHONE */}

        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          Phone Number
        </Text>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="call-outline"
            size={19}
            color={colors.primary}
          />

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            placeholderTextColor={
              colors.textSecondary
            }
            keyboardType="phone-pad"
            style={[
              styles.input,
              {
                color: colors.text,
              },
            ]}
          />
        </View>


        {/* SAVE BUTTON */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={saveProfile}
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={20}
            color={colors.white}
          />

          <Text
            style={[
              styles.saveButtonText,
              {
                color: colors.white,
              },
            ]}
          >
            Save Changes
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    height: 105,
    paddingTop: 45,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 42,
  },

  profileSection: {
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },

  profileIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  profileHint: {
    fontSize: 11,
    marginTop: 9,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },

  inputContainer: {
    height: 52,
    marginHorizontal: 18,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    fontSize: 13,
    marginLeft: 10,
  },

  saveButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 28,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});