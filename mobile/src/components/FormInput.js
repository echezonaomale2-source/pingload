import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ICON_MAP = {
  person: 'person-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  lock: 'lock-closed-outline',
  key: 'key-outline',
  card: 'card-outline',
  gift: 'gift-outline',
};

const resolveIcon = (icon) => {
  if (!icon) return null;
  if (ICON_MAP[icon]) return ICON_MAP[icon];
  if (icon.endsWith('-outline') || icon.startsWith('logo-')) return icon;
  return `${icon}-outline`;
};

const FormInput = ({ label, value, onChangeText, error, icon, secureTextEntry, ...props }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hidden, setHidden] = useState(secureTextEntry);
  const iconName = resolveIcon(icon);

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        mode="outlined"
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.text}
        style={styles.input}
        outlineStyle={styles.outline}
        contentStyle={styles.content}
        error={!!error}
        secureTextEntry={hidden}
        theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
        left={
          iconName
            ? <TextInput.Icon icon={() => <Ionicons name={iconName} size={20} color={colors.textLight} />} forceTextInputFocus={false} />
            : undefined
        }
        right={
          secureTextEntry ? (
            <TextInput.Icon
              icon={() => (
                <TouchableOpacity onPress={() => setHidden(!hidden)}>
                  <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}
            />
          ) : undefined
        }
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { marginBottom: 14 },
  input: { backgroundColor: colors.inputBg, fontSize: 15 },
  outline: { borderRadius: 12 },
  content: { paddingLeft: 4 },
  error: { color: colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
});

export default FormInput;
