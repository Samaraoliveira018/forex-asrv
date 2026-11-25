import { dailyOutcomeCounts, formatBalanceInBrl, grossLoss, isBreakEven, type JournalSnapshot, type Trade, type UsdBrlQuote } from '@asrv/backend';
import { Badge, Button, Card, ProgressBar } from '@asrv/design-system';
import { money, signedMoney, today } from './format';

export interface DailyHomeProps {
  snapshot: JournalSnapshot;
  hidden: boolean;
  quote: UsdBrlQuote | null | undefined;
  quoteUnavailable?: boolean;
  onRefreshQuote: () => void;
  onToggleHidden: () => void;
  onNewTrade: () => void;
  onOpenHistory: () => void;
  onOpenPlan: () => void;
  onNoTradeDay: () => void;
  onEditTrade: (trade: Trade) => void;
}

export function DailyHome({ snapshot, hidden, quote, quoteUnavailable, onRefreshQuote, onToggleHidden, onNewTrade, onOpenHistory, onOpenPlan, onNoTradeDay, onEditTrade }: DailyHomeProps) {
  const trades = snapshot.trades.filter(trade => trade.date === today());
  const counts = dailyOutcomeCounts(trades);
  const losses = grossLoss(trades);
  const stopped = counts.stops >= 2 || counts.takes >= 2 || (losses > 0 && losses >= snapshot.stats.dailyLossLimit);
  const checked = snapshot.dailyPlans.some(plan => plan.date === today());
  return <div className="asrv-daily-home space-y-6">
    <div className="flex items-center justify-between gap-4"><div><p className="asrv-kicker">SEU ESPAÇO DE TRADING</p><h1 className="asrv-page-title">Um dia de cada vez.</h1></div>
      <Button variant="ghost" onClick={onToggleHidden}>{hidden ? 'Mostrar valores' : 'Ocultar valores'}</Button></div>
    <div className="asrv-home-columns">
      <div className="space-y-5">
        <Card ariaLabel="Saldo atual" className="asrv-balance-hero"><p className="asrv-kicker">Saldo atual</p>
          <p className="asrv-balance-hero__value">{money(snapshot.stats.balance, hidden)}</p>
          <p className="asrv-conversion" aria-live="polite">{formatBalanceInBrl(snapshot.stats.balance, hidden, quote, quoteUnavailable)}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3"><Button variant="ghost" size="sm" onClick={onRefreshQuote}>Atualizar cotação</Button>
            {quote?.source === 'ExchangeRate-API' && <a className="asrv-kicker underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a>}</div>
        </Card>
        <div className="asrv-daily-counters" aria-label="Contadores de hoje">
          <Badge tone="neutral" pill>Operações hoje: {counts.operations}</Badge>
          <Badge tone={counts.stops >= 2 ? 'danger' : 'neutral'} pill>Stop Loss: {counts.stops}/2</Badge>
          <Badge tone={counts.takes >= 2 ? 'success' : 'neutral'} pill>Take Profit: {counts.takes}/2</Badge>
        </div>
        {stopped && <p className="asrv-stop-notice" role="status">Meta ou stop diário atingido. Encerre por hoje. Você pode registrar operações já realizadas.</p>}
        <Button aria-label="Nova operação" className="asrv-register" onClick={onNewTrade}>+ Registrar operação</Button>
        <p className="asrv-kicker">BE não conta nos limites · {counts.breakEvens} BE hoje</p>
        <Card ariaLabel="Plano de hoje"><div className="flex items-center justify-between gap-3"><div><h2 className="asrv-section-title">Seu plano de hoje</h2><p className="asrv-page-subtitle">{checked ? 'Checklist salvo. Continue seguindo seu plano.' : 'Reserve um momento para o checklist.'}</p></div>
          <Button variant="secondary" size="sm" onClick={onOpenPlan}>Abrir plano</Button></div></Card>
      </div>
      <div className="space-y-5">
        <Card ariaLabel="Resultado de hoje"><p className="asrv-kicker">Resultado de hoje</p><p className={`asrv-today-result ${snapshot.stats.periods.daily.pnl < 0 ? 'asrv-negative' : 'asrv-positive'}`}>{signedMoney(snapshot.stats.periods.daily.pnl, hidden)}</p>
          <p className="asrv-page-subtitle">Perda diária: {money(losses, hidden)} de {money(snapshot.stats.dailyLossLimit, hidden)}</p>
          <ProgressBar label="Limite financeiro diário" value={losses} max={snapshot.stats.dailyLossLimit || 1} />
        </Card>
        <Card ariaLabel="Operações de hoje"><div className="flex items-center justify-between gap-3 mb-3"><h2 className="asrv-section-title">Hoje</h2><Button variant="ghost" size="sm" onClick={onOpenHistory}>Ver histórico</Button></div>
          {trades.length === 0 ? <div className="space-y-3"><p className="asrv-page-subtitle">{snapshot.noTradeDays.includes(today()) ? 'Dia registrado sem operar.' : 'Seu diário está pronto para a primeira operação.'}</p><Button variant="secondary" size="sm" aria-label="Registrar Dia Sem Operar" onClick={onNoTradeDay}>Dia sem operar</Button></div>
            : [...trades].reverse().slice(0, 4).map(trade => <button type="button" className="asrv-compact-trade" key={trade.id} onClick={() => onEditTrade(trade)} aria-label={`Editar ${trade.asset}`}><span><strong>{trade.asset}</strong><small>{trade.session === 'night' ? 'Noite' : 'Dia'} · {trade.type}</small></span><span className={isBreakEven(trade.pnl) ? 'asrv-muted' : trade.pnl > 0 ? 'asrv-positive' : 'asrv-negative'}>{signedMoney(trade.pnl, hidden)}{isBreakEven(trade.pnl) ? ' · BE' : ''}</span></button>)}
          {trades.length > 4 && <Button variant="ghost" onClick={onOpenHistory}>Ver todas as operações</Button>}
        </Card>
      </div>
    </div>
  </div>;
}
