import { IconSymbol } from '@/components/ui/icon-symbol';
import { haptics } from '@/lib/haptics';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface SwipeButtonProps {
    onComplete: () => void;
    color: string;
    text: string;
}

const BUTTON_HEIGHT = 64;
const BUTTON_PADDING = 6;
const SWIPEABLE_DIMENSIONS = BUTTON_HEIGHT - 2 * BUTTON_PADDING;

export function SwipeButton({ onComplete, color, text }: SwipeButtonProps) {
    const [containerWidth, setContainerWidth] = useState(0);
    const X = useSharedValue(0);
    const [toggled, setToggled] = useState(false);

    const H_SWIPE_RANGE = containerWidth - 2 * BUTTON_PADDING - SWIPEABLE_DIMENSIONS;

    const handleComplete = () => {
        haptics.success();
        setToggled(true);
        onComplete();
        // Delay to allow slide to transition before resetting Slider position
        setTimeout(() => {
            setToggled(false);
            X.value = withSpring(0);
        }, 600);
    };

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (toggled || containerWidth === 0) return;
            X.value = Math.max(0, Math.min(e.translationX, H_SWIPE_RANGE));
        })
        .onEnd(() => {
            if (toggled || containerWidth === 0) return;
            if (X.value < H_SWIPE_RANGE - 20) {
                // Didn't swipe far enough, snap back
                X.value = withSpring(0);
                runOnJS(haptics.light)();
            } else {
                // Swiped enough to trigger
                X.value = withSpring(H_SWIPE_RANGE);
                runOnJS(handleComplete)();
            }
        });

    const AnimatedStyles = {
        swipeable: useAnimatedStyle(() => {
            return {
                transform: [{ translateX: X.value }],
            };
        }),
        swipeText: useAnimatedStyle(() => {
            if (containerWidth === 0) return { opacity: 0 };
            return {
                opacity: interpolate(X.value, [0, H_SWIPE_RANGE / 2], [1, 0], Extrapolation.CLAMP),
                transform: [
                    {
                        translateX: interpolate(X.value, [0, H_SWIPE_RANGE], [0, H_SWIPE_RANGE / 2], Extrapolation.CLAMP),
                    },
                ],
            };
        }),
        backgroundTrack: useAnimatedStyle(() => {
            return {
                backgroundColor: color + '15', // 15% opacity tint for the track background
            };
        }),
    };

    return (
        <GestureHandlerRootView style={{ width: '100%' }}>
            <Animated.View 
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                style={[styles.swipeContainer, AnimatedStyles.backgroundTrack, { width: '100%' }]}
            >
                <Animated.Text style={[styles.swipeText, { color: color }, AnimatedStyles.swipeText]}>
                    {text}
                </Animated.Text>
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.swipeable, { backgroundColor: color }, AnimatedStyles.swipeable]}>
                        <IconSymbol name="arrow.right" size={24} color="#FFFFFF" />
                    </Animated.View>
                </GestureDetector>
            </Animated.View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    swipeContainer: {
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        padding: BUTTON_PADDING,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    swipeText: {
        fontSize: 17,
        fontWeight: '600',
        position: 'absolute',
        zIndex: 1,
    },
    swipeable: {
        height: SWIPEABLE_DIMENSIONS,
        width: SWIPEABLE_DIMENSIONS,
        borderRadius: SWIPEABLE_DIMENSIONS / 2,
        position: 'absolute',
        left: BUTTON_PADDING,
        zIndex: 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
});
