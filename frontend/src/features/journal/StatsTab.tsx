import type { JournalSnapshot } from '@asrv/backend';
import { Card, StatCard } from '@asrv/design-system';
import { DonutChart } from './charts';

export function StatsTab({ snapshot }: { snapshot: JournalSnapshot }) {
  const { stats } = snapshot;
  const total = stats.totalTrades || 1;
  const percent = (value: number) => `${((value / total) * 100).toFixed(1)}% do total`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="asrv-page-title">Dados Estatísticos Detalhados</h1>
        <p className="asrv-page-subtitle">
          Análise de métricas de assertividade, resultados e proporção de trades
        </p>
      </div>

      <section
        aria-label="Estatísticas rápidas"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total de Operações"
          value={String(stats.totalTrades)}
          hint={`${stats.buyCount} Compra / ${stats.sellCount} Venda`}
          icon={<i className="fa-solid fa-list-ol" aria-hidden="true" />}
        />
        <StatCard
          label="Operações Win (Gains)"
          value={String(stats.wins)}
          hint={percent(stats.wins)}
          hintTone="success"
          tone="success"
          icon={<i className="fa-solid fa-circle-check" aria-hidden="true" />}
        />
        <StatCard
          label="Operações Loss (Perdas)"
          value={String(stats.losses)}
          hint={percent(stats.losses)}
          hintTone="danger"
          tone="danger"
          icon={<i className="fa-solid fa-circle-xmark" aria-hidden="true" />}
        />
        <StatCard
          label="Break Even (0x0)"
          value={String(stats.breakEvens)}
          hint={percent(stats.breakEvens)}
          tone="muted"
          icon={<i className="fa-solid fa-scale-balanced" aria-hidden="true" />}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="asrv-section-title mb-3">
            Distribuição (Win vs Loss vs Break Even)
          </h2>
          <DonutChart
            ariaLabel="Distribuição de resultados"
            segments={[
              { label: 'Gains (Win)', value: stats.wins, color: '#10b981' },
              { label: 'Losses (Perda)', value: stats.losses, color: '#ef4444' },
              { label: 'Break Even (0x0)', value: stats.breakEvens, color: '#6b7280' },
            ]}
          />
        </Card>

        <Card>
          <h2 className="asrv-section-title mb-3">
            Proporção por Direção (Compra vs Venda)
          </h2>
          <DonutChart
            ariaLabel="Proporção por direção"
            segments={[
              { label: 'Compra (Long)', value: stats.buyCount, color: '#2563eb' },
              { label: 'Venda (Short)', value: stats.sellCount, color: '#f59e0b' },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
