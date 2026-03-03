import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { IconSymbol } from './icon-symbol';

interface SwipeButtonProps {
    onComplete: () => void;
    title?: string;
    isCompleted?: boolean;
}

const BUTTON_HEIGHT = 56;
const HANDLE_SIZE = 48;

export function SwipeButton({ onComplete, title = "Slide to Analyze", isCompleted = false }: SwipeButtonProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const [buttonWidth, setButtonWidth] = React.useState(0);
    const swipeThreshold = Math.max(0, buttonWidth - HANDLE_SIZE - Spacing.xs * 2);

    const translateX = useSharedValue(0);
    const completed = useSharedValue(isCompleted);

    React.useEffect(() => {
        if (isCompleted && swipeThreshold > 0) {
            translateX.value = withSpring(swipeThreshold);
            completed.value = true;
        }
    }, [isCompleted, swipeThreshold]);

    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            if (completed.value) {
                runOnJS(haptics.light)();
                runOnJS(onComplete)();
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (completed.value) return;
            const nextValue = event.translationX;
            if (nextValue > 0 && nextValue <= swipeThreshold) {
                translateX.value = nextValue;
            }
        })
        .onEnd(() => {
            if (completed.value) return;
            if (translateX.value > swipeThreshold * 0.8) {
                translateX.value = withSpring(swipeThreshold);
                completed.value = true;
                runOnJS(haptics.success)();
                runOnJS(onComplete)();
            } else {
                translateX.value = withSpring(0);
            }
        });

    const gestures = Gesture.Simultaneous(tapGesture, panGesture);

    const handleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: swipeThreshold > 0 ? 1 - translateX.value / swipeThreshold : 1,
    }));

    return (
        <View
            style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
            onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
        >
            <Animated.Text style={[styles.title, { color: colors.textSecondary }, textStyle]}>
                {title}
            </Animated.Text>

            <GestureDetector gesture={gestures}>
                <Animated.View style={styles.gestureArea}>
                    <Animated.View style={[styles.handle, { backgroundColor: colors.tint }, handleStyle]}>
                        <IconSymbol name="chevron.right.2" size={20} color="#FFFFFF" />
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: BUTTON_HEIGHT,
        borderRadius: Radius.full,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xs,
        overflow: 'hidden',
    },
    title: {
        textAlign: 'center',
        fontSize: 15,
        fontWeight: '600',
        position: 'absolute',
        width: '100%',
    },
    gestureArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xs,
    },
    handle: {
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
