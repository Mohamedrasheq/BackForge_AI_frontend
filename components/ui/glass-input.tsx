import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import React, { forwardRef } from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface GlassInputProps extends TextInputProps {
    containerStyle?: StyleProp<ViewStyle>;
    onSend?: () => void;
    showSendButton?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassInput = forwardRef<TextInput, GlassInputProps>(
    ({ containerStyle, onSend, showSendButton = false, value, ...props }, ref) => {
        const colorScheme = useColorScheme() ?? 'light';
        const colors = Colors[colorScheme];
        const scale = useSharedValue(1);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
        }));

        const handlePressIn = () => {
            scale.value = withSpring(0.9, { damping: 15 });
        };

        const handlePressOut = () => {
            scale.value = withSpring(1, { damping: 15 });
        };

        const handleSend = async () => {
            if (onSend && value && value.trim()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSend();
            }
        };

        const hasContent = value && value.trim().length > 0;

        return (
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                    },
                    containerStyle,
                ]}
            >
                <TextInput
                    ref={ref}
                    value={value}
                    style={[
                        styles.input,
                        {
                            color: colors.text,
                        },
                    ]}
                    placeholderTextColor={colors.textSecondary}
                    {...props}
                />
                {showSendButton && (
                    <AnimatedPressable
                        onPress={handleSend}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        style={[
                            animatedStyle,
                            styles.sendButton,
                            {
                                backgroundColor: hasContent ? colors.tint : colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.sendIcon, { opacity: hasContent ? 1 : 0.5 }]}>
                            ↑
                        </Text>
                    </AnimatedPressable>
                )}
            </View>
        );
    }
);

GlassInput.displayName = 'GlassInput';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: Spacing.md,
        paddingRight: Spacing.xs,
        paddingVertical: Spacing.xs,
        borderWidth: 1,
        borderRadius: Radius.full,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: Spacing.sm,
        maxHeight: 120,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.xs,
    },
    sendIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
});
