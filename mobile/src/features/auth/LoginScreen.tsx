import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Input, colors, spacing, typography } from '@asrv/design-system';
import { useBff } from '../../BffContext';

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const bff = useBff();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await bff.auth.signIn(email.trim(), password);
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>DIÁRIO TRADER</Text>
        <Text style={styles.title}>ASRV</Text>
        <Text style={styles.subtitle}>
          Entre para sincronizar suas operações e manter a disciplina.
        </Text>

        <Card style={styles.card}>
          <View style={styles.form}>
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChangeText={setEmail}
              placeholder="samara@example.com"
              autoCapitalize="none"
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChangeText={setPassword}
              placeholder="Sua senha"
            />

            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button onPress={handleSubmit} loading={loading} fullWidth>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  kicker: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    color: colors.dangerText,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.body,
  },
});
