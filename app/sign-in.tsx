import { GoogleLogo } from '@/components/ui/google-icon';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Warm up browser for OAuth
import * as WebBrowser from 'expo-web-browser';

export const useWarmUpBrowser = () => {
    React.useEffect(() => {
        void WebBrowser.warmUpAsync();
        return () => {
            void WebBrowser.coolDownAsync();
        };
    }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
    useWarmUpBrowser();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    // OAuth
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

    // Email Auth
    const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
    const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    const onSignInWithGoogle = useCallback(async () => {
        haptics.light();
        try {
            const { createdSessionId, setActive } = await startOAuthFlow({
                redirectUrl: Linking.createURL('/(tabs)/home', { scheme: 'backforgeai' }),
            });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
            }
        } catch (err) {
            console.error('OAuth error', err);
        }
    }, [startOAuthFlow, router]);

    const onSendCode = async () => {
        if (!isSignInLoaded || !isSignUpLoaded || !email) return;
        haptics.light();
        setIsLoading(true);

        try {
            if (authMode === 'signup') {
                try {
                    const su = await signUp.create({ emailAddress: email });
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

                    if (su.missingFields && su.missingFields.length > 0) {
                        console.log('[Auth] SignUp Missing Fields:', su.missingFields);
                        setMissingFields(su.missingFields);
                    }

                    setPendingVerification(true);
                } catch (signUpErr: any) {
                    if (signUpErr.errors?.[0]?.code === 'form_identifier_exists') {
                        setAuthMode('signin');
                        const si = await signIn.create({ identifier: email });

                        const emailFactor = si.supportedFirstFactors?.find(
                            (f: any) => f.strategy === 'email_code'
                        ) as { emailAddressId: string } | undefined;

                        if (emailFactor) {
                            await si.prepareFirstFactor({
                                strategy: 'email_code',
                                emailAddressId: emailFactor.emailAddressId
                            });
                            setPendingVerification(true);
                        } else {
                            Alert.alert('Error', 'Email sign in not supported for this account');
                        }
                    } else {
                        Alert.alert('Error', signUpErr.errors?.[0]?.message || 'Failed to sign up');
                    }
                }
            } else {
                const si = await signIn.create({ identifier: email });
                if (si.status === 'needs_first_factor') {
                    const emailFactor = si.supportedFirstFactors?.find(
                        (f: any) => f.strategy === 'email_code'
                    ) as { emailAddressId: string } | undefined;

                    if (emailFactor) {
                        await si.prepareFirstFactor({
                            strategy: 'email_code',
                            emailAddressId: emailFactor.emailAddressId
                        });
                        setPendingVerification(true);
                    } else {
                        Alert.alert('Error', 'Email sign in not supported for this account');
                    }
                } else {
                    Alert.alert('Error', 'Unexpected sign-in status');
                }
            }
        } catch (err: any) {
            Alert.alert('Error', err.errors?.[0]?.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const onVerifyCode = async () => {
        if (!isSignInLoaded || !isSignUpLoaded || !code) return;
        haptics.light();
        setIsLoading(true);
        console.log(`[Auth] Verifying code for mode: ${authMode}, code length: ${code.length}`);

        try {
            if (authMode === 'signup') {
                if (missingFields.length > 0) {
                    const updateParams: any = {};
                    if (missingFields.includes('first_name')) updateParams.firstName = firstName;
                    if (missingFields.includes('last_name')) updateParams.lastName = lastName;
                    if (missingFields.includes('password')) updateParams.password = password;

                    if (Object.keys(updateParams).length > 0) {
                        await signUp.update(updateParams);
                    }
                }

                const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
                console.log('[Auth] SignUp Attempt Result:', completeSignUp.status);

                if (completeSignUp.status === 'complete') {
                    await setSignUpActive({ session: completeSignUp.createdSessionId });
                } else {
                    Alert.alert('Verification Failed', `Status: ${completeSignUp.status}\nMissing: ${completeSignUp.missingFields?.join(', ') || 'None'}`);
                    if (completeSignUp.missingFields) {
                        setMissingFields(completeSignUp.missingFields);
                    }
                }
            } else {
                const completeSignIn = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
                console.log('[Auth] SignIn Attempt Result:', completeSignIn.status);
                if (completeSignIn.status === 'complete') {
                    await setSignInActive({ session: completeSignIn.createdSessionId });
                } else {
                    console.log('SignIn Response:', JSON.stringify(completeSignIn, null, 2));
                    Alert.alert('Verification Failed', `Status: ${completeSignIn.status}`);
                }
            }
        } catch (err: any) {
            console.error('[Auth] Verification Error:', JSON.stringify(err, null, 2));
            const errorMessage = err.errors?.[0]?.message || err.message || 'Invalid code';
            const longMessage = err.errors?.[0]?.longMessage;
            Alert.alert('Error', longMessage ? `${errorMessage}\n${longMessage}` : errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        haptics.light();
        setShowEmailForm(false);
        setPendingVerification(false);
        setEmail('');
        setCode('');
        setMissingFields([]);
        setFirstName('');
        setLastName('');
        setPassword('');
    };

    const showNameInputs = authMode === 'signup' && pendingVerification && (missingFields.includes('first_name') || missingFields.includes('last_name'));
    const showPasswordInput = authMode === 'signup' && pendingVerification && missingFields.includes('password');

    const gradientColors = colorScheme === 'dark'
        ? [colors.background, colors.backgroundSecondary, colors.background] as const
        : ['#F8FAFC', '#EEF2FF', '#F8FAFC'] as const;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={gradientColors}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <View style={styles.content}>
                        {/* Header */}
                        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.headerSection}>
                            <Image
                                source={require('@/assets/images/auth-hero.png')}
                                style={styles.heroImage}
                                resizeMode="contain"
                            />
                            <Text style={[styles.title, { color: colors.text }]}>
                                {pendingVerification ? 'Check your email' : 'Welcome to BackForge AI'}
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                {pendingVerification
                                    ? `We sent a verification code to ${email}`
                                    : 'Your personal chief-of-staff, always watching your back.'}
                            </Text>
                        </Animated.View>

                        {/* Form */}
                        <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.formSection}>
                            {!showEmailForm ? (
                                <View style={styles.buttonsContainer}>
                                    {/* Google Button */}
                                    <TouchableOpacity
                                        onPress={onSignInWithGoogle}
                                        activeOpacity={0.9}
                                        style={[styles.oauthButton, {
                                            backgroundColor: colorScheme === 'dark' ? colors.backgroundSecondary : '#FFFFFF',
                                            borderColor: colors.border,
                                        }]}
                                    >
                                        <View style={styles.oauthContent}>
                                            <View style={[styles.oauthIcon, { backgroundColor: '#FFFFFF' }]}>
                                                <GoogleLogo size={20} />
                                            </View>
                                            <Text style={[styles.oauthText, { color: colors.text }]}>
                                                Continue with Google
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Divider */}
                                    <View style={styles.divider}>
                                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
                                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                    </View>

                                    {/* Email Button */}
                                    <TouchableOpacity
                                        onPress={() => setShowEmailForm(true)}
                                        activeOpacity={0.9}
                                        style={[styles.emailButton, { backgroundColor: colors.tint }]}
                                    >
                                        <Text style={styles.emailButtonText}>Continue with Email</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.formContainer}>
                                    {!pendingVerification ? (
                                        <>
                                            <View style={styles.inputWrapper}>
                                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email address</Text>
                                                <TextInput
                                                    style={[styles.input, {
                                                        borderColor: colors.border,
                                                        color: colors.text,
                                                        backgroundColor: colorScheme === 'dark' ? colors.backgroundSecondary : '#FFFFFF'
                                                    }]}
                                                    placeholder="name@example.com"
                                                    placeholderTextColor={colors.textSecondary + '80'}
                                                    value={email}
                                                    onChangeText={setEmail}
                                                    autoCapitalize="none"
                                                    keyboardType="email-address"
                                                    autoFocus
                                                />
                                            </View>
                                            <TouchableOpacity
                                                onPress={onSendCode}
                                                disabled={isLoading || !email}
                                                style={[styles.primaryButton, {
                                                    backgroundColor: colors.tint,
                                                    opacity: isLoading || !email ? 0.6 : 1
                                                }]}
                                            >
                                                {isLoading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <Text style={styles.primaryButtonText}>Send verification code</Text>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            {showNameInputs && (
                                                <View style={styles.nameRow}>
                                                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>First name</Text>
                                                        <TextInput
                                                            style={[styles.input, {
                                                                borderColor: colors.border,
                                                                color: colors.text,
                                                                backgroundColor: colorScheme === 'dark' ? colors.backgroundSecondary : '#FFFFFF'
                                                            }]}
                                                            placeholder="John"
                                                            placeholderTextColor={colors.textSecondary + '80'}
                                                            value={firstName}
                                                            onChangeText={setFirstName}
                                                        />
                                                    </View>
                                                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                                                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Last name</Text>
                                                        <TextInput
                                                            style={[styles.input, {
                                                                borderColor: colors.border,
                                                                color: colors.text,
                                                                backgroundColor: colorScheme === 'dark' ? colors.backgroundSecondary : '#FFFFFF'
                                                            }]}
                                                            placeholder="Doe"
                                                            placeholderTextColor={colors.textSecondary + '80'}
                                                            value={lastName}
                                                            onChangeText={setLastName}
                                                        />
                                                    </View>
                                                </View>
                                            )}

                                            {showPasswordInput && (
                                                <View style={styles.inputWrapper}>
                                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Create a password</Text>
                                                    <TextInput
                                                        style={[styles.input, {
                                                            borderColor: colors.border,
                                                            color: colors.text,
                                                            backgroundColor: colorScheme === 'dark' ? colors.backgroundSecondary : '#FFFFFF'
                                                        }]}
                                                        placeholder="••••••••"
                                                        placeholderTextColor={colors.textSecondary + '80'}
                                                        value={password}
                                                        onChangeText={setPassword}
                                                        secureTextEntry
                                                    />
                                                </View>
                                            )}

                                            <View style={styles.inputWrapper}>
                                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Verification code</Text>
                                                <TextInput
                                                    style={[styles.input, styles.codeInput, {
                                                        borderColor: colors.border,
                                                        color: colors.text,
                                                        backgroundColor: colorScheme === 'dark' ? colors.backgroundSecondary : '#FFFFFF'
                                                    }]}
                                                    placeholder="000000"
                                                    placeholderTextColor={colors.textSecondary + '80'}
                                                    value={code}
                                                    onChangeText={setCode}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    autoFocus
                                                />
                                            </View>

                                            <TouchableOpacity
                                                onPress={onVerifyCode}
                                                disabled={isLoading || !code}
                                                style={[styles.primaryButton, {
                                                    backgroundColor: colors.tint,
                                                    opacity: isLoading || !code ? 0.6 : 1
                                                }]}
                                            >
                                                {isLoading ? (
                                                    <ActivityIndicator color="#fff" />
                                                ) : (
                                                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    <TouchableOpacity onPress={resetForm} style={styles.backButton}>
                                        <Text style={[styles.backText, { color: colors.tint }]}>← Go back</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>

                        {/* Footer */}
                        {!showEmailForm && (
                            <Animated.View entering={FadeInDown.delay(500).duration(800)} style={styles.footer}>
                                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                                    By continuing, you agree to our{' '}
                                    <Text style={{ color: colors.tint }}>Terms</Text> and{' '}
                                    <Text style={{ color: colors.tint }}>Privacy Policy</Text>
                                </Text>
                            </Animated.View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    heroImage: {
        width: 180,
        height: 180,
        borderRadius: 90,
        marginBottom: Spacing.lg,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    iconInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing.sm,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.md,
    },
    formSection: {
        marginBottom: Spacing.xl,
    },
    buttonsContainer: {
        gap: Spacing.md,
    },
    oauthButton: {
        height: 56,
        borderWidth: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    oauthContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    oauthIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    oauthText: {
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: Spacing.md,
        fontSize: 13,
        fontWeight: '500',
    },
    emailButton: {
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emailButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    formContainer: {
        gap: Spacing.lg,
    },
    inputWrapper: {
        gap: Spacing.xs,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: Spacing.lg,
        fontSize: 16,
    },
    codeInput: {
        textAlign: 'center',
        letterSpacing: 8,
        fontSize: 24,
        fontWeight: '600',
    },
    nameRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    primaryButton: {
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    backText: {
        fontSize: 15,
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
});

