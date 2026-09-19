import { GoogleLogo } from '@/components/ui/google-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
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
        redirectUrl: Linking.createURL('/(tabs)', { scheme: 'backforgeai' }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  }, [startOAuthFlow]);

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
            setMissingFields(su.missingFields);
          }
          setPendingVerification(true);
        } catch (signUpErr: any) {
          if (signUpErr.errors?.[0]?.code === 'form_identifier_exists') {
            setAuthMode('signin');
            const si = await signIn.create({ identifier: email });
            const emailFactor = si.supportedFirstFactors?.find(
              (f: { strategy?: string }) => f.strategy === 'email_code'
            ) as { emailAddressId: string } | undefined;

            if (emailFactor) {
              await si.prepareFirstFactor({
                strategy: 'email_code',
                emailAddressId: emailFactor.emailAddressId,
              });
              setPendingVerification(true);
            } else {
              Alert.alert('Error', 'Email sign in is not available for this account.');
            }
          } else {
            Alert.alert('Error', signUpErr.errors?.[0]?.message || 'Failed to sign up');
          }
        }
      } else {
        const si = await signIn.create({ identifier: email });
        if (si.status === 'needs_first_factor') {
          const emailFactor = si.supportedFirstFactors?.find(
            (f: { strategy?: string }) => f.strategy === 'email_code'
          ) as { emailAddressId: string } | undefined;

          if (emailFactor) {
            await si.prepareFirstFactor({
              strategy: 'email_code',
              emailAddressId: emailFactor.emailAddressId,
            });
            setPendingVerification(true);
          } else {
            Alert.alert('Error', 'Email sign in is not available for this account.');
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

    try {
      if (authMode === 'signup') {
        if (missingFields.length > 0) {
          const updateParams: Record<string, string> = {};
          if (missingFields.includes('first_name')) updateParams.firstName = firstName;
          if (missingFields.includes('last_name')) updateParams.lastName = lastName;
          if (missingFields.includes('password')) updateParams.password = password;
          if (Object.keys(updateParams).length > 0) {
            await signUp.update(updateParams);
          }
        }

        const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
        if (completeSignUp.status === 'complete') {
          await setSignUpActive({ session: completeSignUp.createdSessionId });
        } else {
          Alert.alert(
            'Verification failed',
            completeSignUp.missingFields?.join(', ') || completeSignUp.status || 'Try again'
          );
          if (completeSignUp.missingFields) {
            setMissingFields(completeSignUp.missingFields);
          }
        }
      } else {
        const completeSignIn = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code,
        });
        if (completeSignIn.status === 'complete') {
          await setSignInActive({ session: completeSignIn.createdSessionId });
        } else {
          Alert.alert('Verification failed', completeSignIn.status || 'Try again');
        }
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message || err.message || 'Invalid code';
      Alert.alert('Error', err.errors?.[0]?.longMessage || errorMessage);
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

  const showNameInputs =
    authMode === 'signup' &&
    pendingVerification &&
    (missingFields.includes('first_name') || missingFields.includes('last_name'));
  const showPasswordInput =
    authMode === 'signup' && pendingVerification && missingFields.includes('password');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/brand_logo_cropped.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>
                {pendingVerification ? 'Check your email' : 'Welcome back'}
              </Text>
              <Text style={styles.subtitle}>
                {pendingVerification
                  ? `Enter the code we sent to ${email}`
                  : 'Sign in to capture what matters and see what needs you today.'}
              </Text>
            </View>

            {!showEmailForm ? (
              <View style={styles.actions}>
                <Pressable
                  onPress={onSignInWithGoogle}
                  style={({ pressed }) => [styles.oauthButton, pressed && styles.oauthPressed]}
                >
                  <GoogleLogo size={20} />
                  <Text style={styles.oauthText}>Continue with Google</Text>
                </Pressable>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <PrimaryButton label="Continue with email" onPress={() => setShowEmailForm(true)} />
              </View>
            ) : (
              <View style={styles.form}>
                {!pendingVerification ? (
                  <>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      placeholderTextColor={Theme.color.textTertiary}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoFocus
                    />
                    <PrimaryButton
                      label="Send code"
                      onPress={onSendCode}
                      loading={isLoading}
                      disabled={!email}
                    />
                  </>
                ) : (
                  <>
                    {showNameInputs && (
                      <View style={styles.nameRow}>
                        <View style={styles.flex}>
                          <Text style={styles.label}>First name</Text>
                          <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="First"
                            placeholderTextColor={Theme.color.textTertiary}
                          />
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.label}>Last name</Text>
                          <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Last"
                            placeholderTextColor={Theme.color.textTertiary}
                          />
                        </View>
                      </View>
                    )}
                    {showPasswordInput && (
                      <>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                          style={styles.input}
                          value={password}
                          onChangeText={setPassword}
                          placeholder="••••••••"
                          placeholderTextColor={Theme.color.textTertiary}
                          secureTextEntry
                        />
                      </>
                    )}
                    <Text style={styles.label}>Verification code</Text>
                    <TextInput
                      style={[styles.input, styles.codeInput]}
                      placeholder="000000"
                      placeholderTextColor={Theme.color.textTertiary}
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                    <PrimaryButton
                      label="Verify"
                      onPress={onVerifyCode}
                      loading={isLoading}
                      disabled={!code}
                    />
                  </>
                )}
                <Pressable onPress={resetForm} style={styles.back}>
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              </View>
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
    backgroundColor: Theme.color.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Theme.space.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.space.xl,
  },
  logo: {
    width: 160,
    height: 36,
    marginBottom: Theme.space.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Theme.color.text,
    letterSpacing: Platform.OS === 'web' ? 0 : -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
  actions: {
    gap: Theme.space.md,
  },
  oauthButton: {
    height: 54,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.color.border,
    backgroundColor: Theme.color.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  oauthPressed: {
    backgroundColor: Theme.color.accentSoft,
  },
  oauthText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.color.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.color.border,
  },
  dividerText: {
    color: Theme.color.textSecondary,
    fontSize: 13,
  },
  form: {
    gap: Theme.space.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.color.textSecondary,
    marginLeft: 2,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Theme.color.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.space.md,
    fontSize: 16,
    color: Theme.color.text,
    backgroundColor: Theme.color.card,
    marginBottom: Theme.space.sm,
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    gap: Theme.space.md,
  },
  flex: {
    flex: 1,
  },
  back: {
    alignItems: 'center',
    paddingVertical: Theme.space.md,
  },
  backText: {
    color: Theme.color.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
