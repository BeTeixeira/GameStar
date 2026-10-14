import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";

type Props = TextInputProps & {
  label: string;
  error?: string;
  helper?: string;
  isPassword?: boolean;
};

export default function ProfileField({ label, error, helper, isPassword, style, ...rest }: Props) {
  const { colors } = useAppTheme();
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View
        style={[
          styles.inputRow,
          { backgroundColor: colors.inputBackground, borderColor: error ? colors.danger : colors.cardBorder },
        ]}
      >
        <TextInput
          {...rest}
          secureTextEntry={isPassword ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.textPrimary }, style]}
          autoCapitalize={rest.autoCapitalize ?? "none"}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 11, marginBottom: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  input: { flex: 1, fontSize: 13, paddingVertical: 9 },
  message: { fontSize: 10, marginTop: 4 },
});