import { haptics } from '@/lib/haptics';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, TouchableOpacityProps, ViewStyle } from 'react-native';

interface HapticButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    hapticStyle?: 'light' | 'medium' | 'heavy' | 'selection';
    textStyle?: TextStyle;
    buttonStyle?: ViewStyle;
}

/**
 * A button component with built-in haptic feedback
 */
export function HapticButton({
    title,
    variant = 'primary',
    size = 'md',
    loading = false,
    hapticStyle = 'light',
    textStyle,
    buttonStyle,
    onPress,
    disabled,
    style,
    ...props
}: HapticButtonProps) {
    const handlePress = (event: any) => {
        if (!disabled && !loading) {
            // Trigger haptic feedback
            haptics[hapticStyle]();
            onPress?.(event);
        }
    };

    return (
        <TouchableOpacity
            {...props}
            onPress={handlePress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[
                styles.base,
                styles[size],
                styles[variant],
                (disabled || loading) && styles.disabled,
                buttonStyle,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#4F46E5'} />
            ) : (
                <Text style={[
                    styles.text,
                    styles[`${size}Text`],
                    styles[`${variant}Text`],
                    textStyle,
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Sizes
    sm: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    md: {
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    lg: {
        paddingVertical: 18,
        paddingHorizontal: 32,
    },
    // Variants
    primary: {
        backgroundColor: '#4F46E5',
    },
    secondary: {
        backgroundColor: '#E2E8F0',
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#4F46E5',
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    disabled: {
        opacity: 0.6,
    },
    // Text base
    text: {
        fontWeight: '600',
    },
    // Text sizes
    smText: {
        fontSize: 14,
    },
    mdText: {
        fontSize: 16,
    },
    lgText: {
        fontSize: 18,
    },
    // Text variants
    primaryText: {
        color: '#FFFFFF',
    },
    secondaryText: {
        color: '#1E293B',
    },
    outlineText: {
        color: '#4F46E5',
    },
    ghostText: {
        color: '#4F46E5',
    },
});
