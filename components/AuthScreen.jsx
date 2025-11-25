import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen({ onAuthenticated }) {
    const [pin, setPin] = useState('');
    const [storedPin, setStoredPin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [confirmPin, setConfirmPin] = useState('');

    useEffect(() => {
        checkPin();
    }, []);

    const checkPin = async () => {
        try {
            const savedPin = await AsyncStorage.getItem('user_pin');
            if (savedPin) {
                setStoredPin(savedPin);
                setIsSettingUp(false);
            } else {
                setIsSettingUp(true);
            }
        } catch (error) {
            console.error('Error checking PIN:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePress = (number) => {
        if (pin.length < 4) {
            setPin(prev => prev + number);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleSubmit = async () => {
        if (pin.length !== 4) return;

        if (isSettingUp) {
            if (!confirmPin) {
                // Primera vez ingresando el nuevo PIN
                setConfirmPin(pin);
                setPin('');
                Alert.alert("Confirmar PIN", "Ingresa el PIN nuevamente para confirmar.");
            } else {
                // Confirmando el PIN
                if (pin === confirmPin) {
                    try {
                        await AsyncStorage.setItem('user_pin', pin);
                        Alert.alert("¡Éxito!", "PIN configurado correctamente.");
                        onAuthenticated();
                    } catch (error) {
                        Alert.alert("Error", "No se pudo guardar el PIN.");
                        setConfirmPin('');
                        setPin('');
                    }
                } else {
                    Alert.alert("Error", "Los PIN no coinciden. Intenta de nuevo.");
                    setConfirmPin('');
                    setPin('');
                }
            }
        } else {
            // Validando PIN existente
            if (pin === storedPin) {
                onAuthenticated();
            } else {
                Alert.alert("Error", "PIN incorrecto");
                setPin('');
            }
        }
    };

    useEffect(() => {
        if (pin.length === 4) {
            // Pequeño delay para que el usuario vea el último número
            setTimeout(() => {
                handleSubmit();
            }, 100);
        }
    }, [pin]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#16a34a" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="lock-closed-outline" size={80} color="#16a34a" />
            </View>

            <Text style={styles.title}>
                {isSettingUp
                    ? (confirmPin ? "Confirma tu nuevo PIN" : "Crea un PIN de acceso")
                    : "Ingresa tu PIN"}
            </Text>

            <View style={styles.pinContainer}>
                {[...Array(4)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.pinDot,
                            pin.length > i ? styles.pinDotFilled : null
                        ]}
                    />
                ))}
            </View>

            <View style={styles.keypad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <TouchableOpacity
                        key={num}
                        style={styles.key}
                        onPress={() => handlePress(num.toString())}
                    >
                        <Text style={styles.keyText}>{num}</Text>
                    </TouchableOpacity>
                ))}
                <View style={styles.keyHidden} />
                <TouchableOpacity
                    style={styles.key}
                    onPress={() => handlePress('0')}
                >
                    <Text style={styles.keyText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.key}
                    onPress={handleDelete}
                >
                    <Ionicons name="backspace-outline" size={28} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    iconContainer: {
        marginBottom: 20,
        backgroundColor: '#dcfce7',
        padding: 20,
        borderRadius: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#166534',
        marginBottom: 30,
    },
    pinContainer: {
        flexDirection: 'row',
        marginBottom: 50,
        gap: 20,
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#16a34a',
        backgroundColor: 'transparent',
    },
    pinDotFilled: {
        backgroundColor: '#16a34a',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 300,
        justifyContent: 'center',
        gap: 20,
    },
    key: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    keyHidden: {
        width: 80,
        height: 80,
    },
    keyText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#333',
    },
});
