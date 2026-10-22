import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, typography } from '@asrv/design-system';
import { useBff } from './BffContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { JournalScreen } from './features/journal/JournalScreen';

type Status = 'loading' | 'anonymous' | 'authenticated';

export function App() {
  const bff = useBff();
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;

    bff
      .ready()
      .then((session) => {
        if (active) setStatus(session ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) setStatus('anonymous');
      });

    return () => {
      active = false;
    };
  }, [bff]);

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {status === 'anonymous' ? (
        <LoginScreen onSignedIn={() => setStatus('authenticated')} />
      ) : (
        <JournalScreen onSignedOut={() => setStatus('anonymous')} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
});
