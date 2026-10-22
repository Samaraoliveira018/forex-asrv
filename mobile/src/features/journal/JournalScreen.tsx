import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { JournalSnapshot, Trade, TradeInput } from '@asrv/backend';
import {
  Alert,
  Badge,
  Button,
  Input,
  Modal,
  Textarea,
  colors,
  radii,
  spacing,
  typography,
} from '@asrv/design-system';
import { useBff } from '../../BffContext';
import { DashboardTab } from './DashboardTab';
import { JournalTab, type JournalView, type Market } from './JournalTab';
import { PlanTab } from './PlanTab';
import { StatsTab } from './StatsTab';
import { TradeModal } from './TradeModal';
import { money, today } from './format';

type Tab = 'dashboard' | 'journal' | 'plan' | 'stats';

const tabs: ReadonlyArray<{ id: Tab; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'journal', label: 'Diário', icon: '▤' },
  { id: 'plan', label: 'Plano', icon: '☑' },
  { id: 'stats', label: 'Estatísticas', icon: '◔' },
];

export function JournalScreen({ onSignedOut }: { onSignedOut: () => void }) {
  const bff = useBff();
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState<JournalSnapshot | null>(null);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('journal');
  const [market, setMarket] = useState<Market>('internacional');
  const [view, setView] = useState<JournalView>('grid');
  const [hidden, setHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState('0');
  const [balanceError, setBalanceError] = useState('');
  const [noTradeOpen, setNoTradeOpen] = useState(false);
  const [noTradeDate, setNoTradeDate] = useState(today());
  const [noTradeError, setNoTradeError] = useState('');
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>(() => [false, false, false, false]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState('');
  const [importError, setImportError] = useState('');

  const load = useCallback(async () => {
    const next = await bff.journal.list();
    setSnapshot(next);
    setBalanceDraft(String(next.initialBalance));
    return next;
  }, [bff]);

  useEffect(() => {
    let active = true;
    bff.journal
      .list()
      .then((next) => {
        if (!active) return;
        setSnapshot(next);
        setBalanceDraft(String(next.initialBalance));
      })
      .catch((cause) => {
        if (active) setError(messageOf(cause));
      });

    return () => {
      active = false;
    };
  }, [bff]);

  useEffect(() => {
    bff.journal
      .pendingCount()
      .then(setPending)
      .catch(() => setPending(0));
  }, [bff, snapshot]);

  async function handleSaveTrade(input: TradeInput) {
    setError('');
    setWarnings([]);
    const result = await bff.journal.saveTrade(input);
    const messages = [...result.warnings];
    if (!result.synced) {
      messages.push('Salvo no dispositivo; será enviado ao reconectar.');
    }
    setWarnings(messages);
    await load();
  }

  function handleDeleteTrade(trade: Trade) {
    confirmDestructive(
      'Eliminar operação',
      `Tem a certeza de que deseja eliminar ${trade.asset}?`,
      async () => {
        setError('');
        try {
          await bff.journal.deleteTrade(trade.id);
          await load();
        } catch (cause) {
          setError(messageOf(cause));
        }
      },
    );
  }

  function handleDeleteNoTradeDay(day: string) {
    confirmDestructive(
      'Remover dia sem operar',
      `Remover o registro de 'Não Operei' da data ${day}?`,
      async () => {
        setError('');
        try {
          await bff.journal.removeNoTradeDay(day);
          await load();
        } catch (cause) {
          setError(messageOf(cause));
        }
      },
    );
  }

  function openNoTradeDay() {
    setNoTradeDate(today());
    setNoTradeError('');
    setNoTradeOpen(true);
  }

  async function submitNoTradeDay() {
    setNoTradeError('');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(noTradeDate)) {
      setNoTradeError('Formato de data inválido. Use AAAA-MM-DD.');
      return;
    }

    try {
      await bff.journal.registerNoTradeDay(noTradeDate);
      setNoTradeOpen(false);
      await load();
    } catch (cause) {
      setNoTradeError(messageOf(cause));
    }
  }

  function openBalance() {
    setBalanceDraft(String(snapshot?.initialBalance ?? 0));
    setBalanceError('');
    setBalanceOpen(true);
  }

  async function submitBalance() {
    const value = Number(balanceDraft.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      setBalanceError('O saldo inicial deve ser maior ou igual a zero.');
      return;
    }

    try {
      await bff.journal.saveInitialBalance(value);
      setBalanceOpen(false);
      await load();
    } catch (cause) {
      setBalanceError(messageOf(cause));
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    try {
      await bff.journal.flush();
      setPending(await bff.journal.pendingCount());
      await load();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    if (!snapshot) return;
    const payload = JSON.stringify(
      {
        trades: snapshot.trades,
        noTradeDays: snapshot.noTradeDays,
        initialBalance: snapshot.initialBalance,
      },
      null,
      2,
    );

    try {
      await Share.share({
        title: `diario_trader_asrv_backup_${today()}.json`,
        message: payload,
      });
      setWarnings(['Backup gerado. Escolha onde compartilhar o arquivo JSON.']);
      setActionsOpen(false);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }

  function openImport() {
    setImportDraft('');
    setImportError('');
    setActionsOpen(false);
    setImportOpen(true);
  }

  async function handleImport() {
    setImportError('');

    try {
      const parsed = JSON.parse(importDraft) as {
        trades?: Trade[];
        noTradeDays?: string[];
        initialBalance?: number;
      };

      if (!Array.isArray(parsed.trades)) {
        throw new Error('JSON inválido: o campo "trades" é obrigatório.');
      }

      for (const trade of parsed.trades) {
        await bff.journal.saveTrade(trade);
      }
      for (const day of parsed.noTradeDays ?? []) {
        try {
          await bff.journal.registerNoTradeDay(day);
        } catch {
          // Dia já existente ou com operação: a importação continua.
        }
      }
      if (Number.isFinite(parsed.initialBalance)) {
        await bff.journal.saveInitialBalance(Number(parsed.initialBalance));
      }

      await load();
      setImportOpen(false);
      setImportDraft('');
      setWarnings(['Dados importados com sucesso.']);
    } catch (cause) {
      setImportError(
        cause instanceof SyntaxError
          ? 'JSON inválido. Verifique o conteúdo e tente novamente.'
          : messageOf(cause),
      );
    }
  }

  function handleReset() {
    if (!snapshot) return;

    confirmDestructive(
      'Resetar dados',
      'Tem a certeza de que deseja resetar todo o histórico e a sua ofensiva?',
      async () => {
        setError('');
        try {
          for (const trade of snapshot.trades) {
            await bff.journal.deleteTrade(trade.id);
          }
          for (const day of snapshot.noTradeDays) {
            await bff.journal.removeNoTradeDay(day);
          }
          await load();
          setActionsOpen(false);
          setWarnings(['Dados resetados.']);
        } catch (cause) {
          setError(messageOf(cause));
        }
      },
      'Resetar',
    );
  }

  async function handleSignOut() {
    try {
      await bff.auth.signOut();
    } finally {
      onSignedOut();
    }
  }

  function openNewTrade() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEditTrade(trade: Trade) {
    setEditing(trade);
    setModalOpen(true);
  }

  if (!snapshot) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Carregando diário…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>DT</Text>
          </View>
          <Text style={styles.brandTitle} numberOfLines={1}>
            Diário Trader ASRV
          </Text>
        </View>

        <View style={styles.topbarRight}>
          <Badge tone="orange" pill>
            🔥 {snapshot.discipline.streak}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            accessibilityLabel="Mais ações"
            onPress={() => setActionsOpen(true)}
          >
            ⋯
          </Button>
        </View>
      </View>

      <View style={styles.accountBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar saldo inicial"
          onPress={openBalance}
          style={({ pressed }) => [styles.balanceChip, pressed && styles.pressed]}
        >
          <Text style={styles.balanceLabel}>Saldo inicial</Text>
          <Text style={styles.balanceValue}>{money(snapshot.initialBalance)}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sincronizar dados"
          accessibilityState={{ busy: syncing, disabled: syncing }}
          disabled={syncing}
          onPress={handleSync}
          style={({ pressed }) => [
            styles.syncChip,
            pressed && !syncing && styles.pressed,
            syncing && styles.disabled,
          ]}
        >
          <Text style={styles.syncText}>{syncing ? 'Sincronizando…' : 'Sincronizar'}</Text>
          {pending > 0 ? (
            <Badge tone="warning">{pending} pendência(s)</Badge>
          ) : (
            <Text style={styles.syncOk}>Em dia</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {warnings.length > 0 ? (
          <Alert tone="warning">{warnings.join('\n')}</Alert>
        ) : null}

        {tab === 'journal' ? (
          <JournalTab
            snapshot={snapshot}
            hidden={hidden}
            market={market}
            view={view}
            onMarketChange={setMarket}
            onViewChange={setView}
            onToggleHidden={() => setHidden((current) => !current)}
            onNewTrade={openNewTrade}
            onEditTrade={openEditTrade}
            onDeleteTrade={handleDeleteTrade}
            onNoTradeDay={openNoTradeDay}
            onDeleteNoTradeDay={handleDeleteNoTradeDay}
          />
        ) : null}

        {tab === 'dashboard' ? <DashboardTab snapshot={snapshot} hidden={hidden} /> : null}

        {tab === 'plan' ? (
          <PlanTab
            checklist={checklist}
            onToggle={(index, checked) =>
              setChecklist((current) =>
                current.map((value, position) => (position === index ? checked : value)),
              )
            }
          />
        ) : null}

        {tab === 'stats' ? <StatsTab snapshot={snapshot} /> : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Diário Trader ASRV · disciplina e gestão de risco</Text>
          <Text style={styles.footerText}>
            Patrimônio: <Text style={styles.footerStrong}>{money(snapshot.stats.balance, hidden)}</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.id)}
              style={({ pressed }) => [
                styles.tabItem,
                active && styles.tabItemActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabIcon, active && styles.tabTextActive]}>{item.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TradeModal
        open={modalOpen}
        trade={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSaveTrade}
      />

      <Modal
        open={balanceOpen}
        title="Saldo Inicial"
        size="sm"
        onClose={() => setBalanceOpen(false)}
        footer={
          <>
            <Button variant="secondary" onPress={() => setBalanceOpen(false)}>
              Cancelar
            </Button>
            <Button onPress={submitBalance}>Salvar Saldo</Button>
          </>
        }
      >
        <Input
          label="Saldo Inicial"
          type="number"
          value={balanceDraft}
          onChangeText={setBalanceDraft}
          placeholder="1000"
        />
        {balanceError ? <Alert tone="danger">{balanceError}</Alert> : null}
      </Modal>

      <Modal
        open={noTradeOpen}
        title="Registrar Dia Sem Operar"
        size="sm"
        onClose={() => setNoTradeOpen(false)}
        footer={
          <>
            <Button variant="secondary" onPress={() => setNoTradeOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onPress={submitNoTradeDay}>
              Registrar
            </Button>
          </>
        }
      >
        <Input
          label="Data sem operação"
          value={noTradeDate}
          onChangeText={setNoTradeDate}
          placeholder="AAAA-MM-DD"
        />
        {noTradeError ? <Alert tone="danger">{noTradeError}</Alert> : null}
      </Modal>

      <Modal
        open={actionsOpen}
        title="Armazenamento e Dados"
        size="sm"
        onClose={() => setActionsOpen(false)}
        footer={
          <Button variant="secondary" onPress={() => setActionsOpen(false)}>
            Fechar
          </Button>
        }
      >
        <Text style={styles.actionDescription}>
          Faça backup do diário, restaure um JSON existente ou limpe todo o histórico.
        </Text>
        <Button variant="secondary" fullWidth onPress={handleExport}>
          Exportar JSON
        </Button>
        <Button variant="secondary" fullWidth onPress={openImport}>
          Importar JSON
        </Button>
        <Button variant="danger" fullWidth onPress={handleReset}>
          Resetar Todos os Dados
        </Button>
        <Button variant="secondary" fullWidth onPress={handleSignOut}>
          Sair da conta
        </Button>
        {pending > 0 ? (
          <Alert tone="warning">
            {pending} registro(s) aguardando sincronização. Sincronize antes de exportar se quiser
            garantir que o backup está atualizado.
          </Alert>
        ) : null}
      </Modal>

      <Modal
        open={importOpen}
        title="Importar JSON"
        size="sm"
        onClose={() => setImportOpen(false)}
        footer={
          <>
            <Button variant="secondary" onPress={() => setImportOpen(false)}>
              Cancelar
            </Button>
            <Button onPress={handleImport}>Importar Dados</Button>
          </>
        }
      >
        <Text style={styles.actionDescription}>
          Cole o conteúdo do arquivo exportado pelo Diário Trader ASRV.
        </Text>
        <Textarea
          label="Conteúdo JSON"
          value={importDraft}
          onChangeText={setImportDraft}
          placeholder='{"trades": [], "noTradeDays": [], "initialBalance": 1000}'
          rows={8}
        />
        {importError ? <Alert tone="danger">{importError}</Alert> : null}
      </Modal>
    </View>
  );
}

function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'Eliminar',
) {
  NativeAlert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  brandMarkText: {
    color: colors.primaryText,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandTitle: {
    flexShrink: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '700',
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  accountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  balanceChip: {
    flex: 1,
    gap: 1,
    paddingVertical: spacing.xs,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: typography.caption - 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  balanceValue: {
    color: colors.successText,
    fontSize: typography.body,
    fontWeight: '700',
  },
  syncChip: {
    alignItems: 'flex-end',
    gap: 2,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  syncText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '600',
  },
  syncOk: {
    color: colors.successText,
    fontSize: typography.caption - 1,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  footerText: {
    color: '#6b7280',
    fontSize: typography.caption - 1,
  },
  footerStrong: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  actionDescription: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabItemActive: {
    borderTopColor: colors.primary,
  },
  tabIcon: {
    color: colors.textMuted,
    fontSize: typography.subtitle,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: typography.caption - 1,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primaryHover,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.6,
  },
});
