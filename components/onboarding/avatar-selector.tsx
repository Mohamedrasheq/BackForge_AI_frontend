import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

// Expressive "Agent Persona" avatars using DiceBear Lorelei
const MALE_SEEDS = [
    { id: 'm1', name: 'The Scout', seed: 'Felix' },
    { id: 'm2', name: 'The Sage', seed: 'Jack' },
    { id: 'm3', name: 'The Creator', seed: 'Oliver' },
    { id: 'm4', name: 'The Rebel', seed: 'Alexander' },
    { id: 'm5', name: 'The Hero', seed: 'Max' },
];

const FEMALE_SEEDS = [
    { id: 'f1', name: 'The Scout', seed: 'Aneka' },
    { id: 'f2', name: 'The Sage', seed: 'Cloe' },
    { id: 'f3', name: 'The Creator', seed: 'Heidi' },
    { id: 'f4', name: 'The Rebel', seed: 'Mimi' },
    { id: 'f5', name: 'The Hero', seed: 'Lulu' },
];

const BACKGROUND_COLORS = [
    '#4F46E5', // Indigo
    '#0D9488', // Teal
    '#F97316', // Orange
    '#8B5CF6', // Purple
    '#E11D48', // Crimson
    '#0EA5E9', // Sky
    '#10B981', // Emerald
];

interface AvatarSelectorProps {
    selectedId: string | null;
    onSelect: (id: string, url: string) => void;
}

export function AvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const [gender, setGender] = useState<'male' | 'female'>('male');
    const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);

    // Choose seeds based on gender
    const currentSeeds = gender === 'male' ? MALE_SEEDS : FEMALE_SEEDS;
    const [activeSeed, setActiveSeed] = useState(currentSeeds[0]);

    // Construct URL based on current selection
    const getAvatarUrl = (seed: string, bg: string) => {
        const cleanBg = bg.replace('#', '');
        return `https://api.dicebear.com/7.x/lorelei/png?seed=${seed}&backgroundColor=${cleanBg}`;
    };

    const handleSelectSeed = (seedItem: typeof MALE_SEEDS[0]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSeed(seedItem);
        onSelect(seedItem.id, getAvatarUrl(seedItem.seed, bgColor));
    };

    const handleSelectColor = (color: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBgColor(color);
        onSelect(activeSeed.id, getAvatarUrl(activeSeed.seed, color));
    };

    const handleGenderChange = (newGender: 'male' | 'female') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setGender(newGender);
        const newSeeds = newGender === 'male' ? MALE_SEEDS : FEMALE_SEEDS;
        setActiveSeed(newSeeds[0]);
        onSelect(newSeeds[0].id, getAvatarUrl(newSeeds[0].seed, bgColor));
    };

    // Initialize selection if none exists
    useEffect(() => {
        if (!selectedId) {
            onSelect(activeSeed.id, getAvatarUrl(activeSeed.seed, bgColor));
        }
    }, []);

    const activeUrl = getAvatarUrl(activeSeed.seed, bgColor);

    return (
        <View style={styles.container}>
            {/* WhatsApp-style Large Preview */}
            <View style={styles.previewContainer}>
                <View style={[styles.largeImageWrapper, { backgroundColor: bgColor + '20', borderColor: bgColor }]}>
                    <Image
                        source={{ uri: activeUrl }}
                        style={styles.largeImage}
                        contentFit="contain"
                        transition={200}
                    />
                </View>
                <Text style={[styles.personaName, { color: colors.text }]}>{activeSeed.name}</Text>
            </View>

            {/* Gender Toggle */}
            <View style={[styles.genderToggle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Pressable
                    onPress={() => handleGenderChange('male')}
                    style={[styles.genderTab, gender === 'male' && { backgroundColor: bgColor }]}
                >
                    <Text style={[styles.genderTabText, { color: gender === 'male' ? '#FFFFFF' : colors.textSecondary }]}>MEN</Text>
                </Pressable>
                <Pressable
                    onPress={() => handleGenderChange('female')}
                    style={[styles.genderTab, gender === 'female' && { backgroundColor: bgColor }]}
                >
                    <Text style={[styles.genderTabText, { color: gender === 'female' ? '#FFFFFF' : colors.textSecondary }]}>WOMEN</Text>
                </Pressable>
            </View>

            {/* Background Color Picker */}
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>BACKGROUND COLOR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorScroll}>
                    {BACKGROUND_COLORS.map((color) => (
                        <Pressable
                            key={color}
                            onPress={() => handleSelectColor(color)}
                            style={[
                                styles.colorDot,
                                { backgroundColor: color, borderColor: bgColor === color ? colors.text : 'transparent' }
                            ]}
                        >
                            {bgColor === color && (
                                <IconSymbol name="checkmark" size={12} color="#FFFFFF" weight="bold" />
                            )}
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Persona Presets */}
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AGENT PERSONA</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.presetScroll}
                    nestedScrollEnabled={true}
                    directionalLockEnabled={true}
                >
                    {currentSeeds.map((seed) => {
                        const isSelected = activeSeed.id === seed.id;
                        const thumbUrl = getAvatarUrl(seed.seed, 'f1f5f9'); // Neutral thumb
                        return (
                            <Pressable
                                key={seed.id}
                                onPress={() => handleSelectSeed(seed)}
                                style={[
                                    styles.presetCard,
                                    {
                                        borderColor: isSelected ? bgColor : colors.border,
                                        backgroundColor: isSelected ? bgColor + '08' : colors.backgroundSecondary
                                    }
                                ]}
                            >
                                <Image source={{ uri: thumbUrl }} style={styles.presetThumb} />
                                {isSelected && (
                                    <View style={[styles.miniCheck, { backgroundColor: bgColor }]}>
                                        <IconSymbol name="checkmark" size={8} color="#FFFFFF" />
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    largeImageWrapper: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: Spacing.md,
    },
    largeImage: {
        width: 120,
        height: 120,
    },
    personaName: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    genderToggle: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: Spacing.xl,
        width: 200,
    },
    genderTab: {
        flex: 1,
        height: 38,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderTabText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    section: {
        width: '100%',
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    colorScroll: {
        paddingHorizontal: Spacing.xl,
        gap: 12,
        paddingVertical: 4,
    },
    colorDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetScroll: {
        paddingHorizontal: Spacing.xl,
        gap: 12,
        paddingVertical: 4,
    },
    presetCard: {
        width: 64,
        height: 64,
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    presetThumb: {
        width: 50,
        height: 50,
    },
    miniCheck: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
