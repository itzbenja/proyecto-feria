import React, { memo } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';

// Componente estable para el input de monto. Se vuelve a renderizar solo si cambia value o error.
const MontoInput = memo(function MontoInput({ value, onChange, placeholder = 'Monto $', error }) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        returnKeyType="done"
        underlineColorAndroid="transparent"
        selectionColor="#000"
        allowFontScaling={false}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, marginRight: 8 },
  input: {
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    minHeight: 54,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600'
  }
});

export default MontoInput;
