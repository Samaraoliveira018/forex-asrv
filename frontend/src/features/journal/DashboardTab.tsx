import type { JournalSnapshot } from '@asrv/backend';
import { Card, StatCard } from '@asrv/design-system';
import { AssetBarChart } from './charts';
import { money, signedMoney } from './format';

export function DashboardTab({
  snapshot,
  hidden,
}: {
  snapshot: JournalSnapshot;
  hidden: boolean;
}) {
  const { stats } = snapshot;
  const profitFactor = Number.isFinite(stats.profitFactor)
    ? stats.profitFactor.toFixed(2)
    : '∞';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="asrv-page-title">Dashboard Geral</h1>
        <p className="asrv-page-subtitle">
          Visão panorâmica do seu progresso e métricas operacionais
        </p>
      </div>

      <section aria-label="Métricas do dashboard" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Fator de Lucro (Profit Factor)" value={profitFactor} />
        <StatCard
          label="Maior Gain"
          value={`+ ${money(stats.maxWin, hidden)}`}
          tone="success"
        />
        <StatCard
          label="Maior Loss"
          value={`- ${money(Math.abs(stats.maxLoss), hidden)}`}
          tone="danger"
        />
      </section>

      <Card ariaLabel="Distribuição por ativo">
        <h2 className="asrv-section-title mb-4">Distribuição de Operações por Ativo</h2>
        <AssetBarChart trades={snapshot.trades} />
      </Card>

      <section aria-label="Resumo do dashboard" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Operações" value={String(stats.totalTrades)} />
        <StatCard label="Gains" value={String(stats.wins)} tone="success" />
        <StatCard label="Losses" value={String(stats.losses)} tone="danger" />
        <StatCard label="Break Evens" value={String(stats.breakEvens)} tone="muted" />
      </section>

      <Card>
        <h2 className="asrv-section-title mb-2">Resultado</h2>
        <p className="text-sm text-slate-400">
          Resultado acumulado de{' '}
          <strong className={stats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {signedMoney(stats.totalPnl, hidden)}
          </strong>{' '}
          sobre um capital inicial de {money(snapshot.initialBalance, hidden)}.
        </p>
      </Card>
    </div>
  );
}
