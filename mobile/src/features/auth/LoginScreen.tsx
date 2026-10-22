import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Button,
  Card,
  Input,
  colors,
  spacing,
  typography,
} from '@asrv/design-system';
import { useBff } from '../../BffContext';

export function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const bff = useBff();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setInfo('');

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

  function handleForgotPassword() {
    setInfo('A redefinição de senha é feita no painel do Supabase.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.xxl + insets.top, paddingBottom: spacing.xxl + insets.bottom },
        ]}
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

            {error ? <Alert tone="danger">{error}</Alert> : null}
            {info ? <Alert tone="warning">{info}</Alert> : null}

            <Button onPress={handleSubmit} loading={loading} fullWidth>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>

            <Button variant="ghost" size="sm" onPress={handleForgotPassword}>
              Esqueci a senha
            </Button>
          </View>

          <Text style={styles.closed}>
            O cadastro é fechado. Use o usuário criado no painel do Supabase.
          </Text>
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
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
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
    width: '100%',
  },
  form: {
    gap: spacing.md,
  },
  closed: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.caption - 1,
    textAlign: 'center',
  },
});
