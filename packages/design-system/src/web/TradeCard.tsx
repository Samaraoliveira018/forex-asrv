import { classNames } from './classNames';
import { Badge } from './Badge';

export type TradeDirection = 'Compra' | 'Venda';

export interface TradeCardProps {
  asset: string;
  date: string;
  type: TradeDirection;
  /** Sessão do mercado: `day` (dia) ou `night` (noite). */
  session?: 'day' | 'night';
  lots: number;
  pnl: number;
  notes?: string;
  /** URL assinada do print da operação (opcional). */
  screenshotUrl?: string;
  hidden?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  className?: string;
}

export function TradeCard({
  asset,
  date,
  type,
  session,
  lots,
  pnl,
  notes,
  screenshotUrl,
  hidden = false,
  onEdit,
  onDelete,
  editLabel = 'Editar',
  deleteLabel = 'Eliminar',
  className,
}: TradeCardProps) {
  const breakEven = Math.abs(pnl) <= 0.3;
  const tone = breakEven ? 'muted' : pnl > 0 ? 'success' : 'danger';
  const pnlText = hidden
    ? '••••••'
    : breakEven
      ? `${pnl < 0 ? '-' : '+'} $ ${Math.abs(pnl).toFixed(2)} (BE)`
      : `${pnl > 0 ? '+ ' : '- '}${Math.abs(pnl).toFixed(2)}`;
  const displayDate = shortDate(date);

  return (
    <article className={classNames('asrv-trade-card', className)}>
      <div className="asrv-trade-card__header">
        <div className="asrv-trade-card__header-main">
          <div className="asrv-trade-card__asset-group">
            <span className="asrv-trade-card__asset">{asset}</span>
            {breakEven ? <Badge tone="neutral">BREAK EVEN</Badge> : null}
          </div>
          <div className="asrv-trade-card__badges">
            <Badge tone={type === 'Compra' ? 'success' : 'danger'}>{type}</Badge>
            {session ? (
              <Badge tone={session === 'night' ? 'orange' : 'info'}>
                {session === 'night' ? 'Noite' : 'Dia'}
              </Badge>
            ) : null}
          </div>
        </div>
        <span className="asrv-trade-card__date">{displayDate}</span>
      </div>

      <div className="asrv-trade-card__body">
        <p className="asrv-kicker">
          Lotes / Contratos: <strong style={{ color: '#e5e7eb' }}>{lots}</strong>
        </p>
        <p
          className={classNames(
            'asrv-trade-card__pnl',
            tone === 'success' && 'asrv-positive',
            tone === 'danger' && 'asrv-negative',
          )}
        >
          {pnlText}
        </p>
        {notes ? <p className="asrv-trade-card__notes">{notes}</p> : null}
        {screenshotUrl ? (
          <a
            className="asrv-trade-card__shot"
            href={screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver print da operação ${asset} de ${displayDate}`}
          >
            <img
              src={screenshotUrl}
              alt={`Print da operação ${asset} de ${displayDate}`}
              loading="lazy"
            />
          </a>
        ) : null}
      </div>

      {onEdit || onDelete ? (
        <div className="asrv-trade-card__footer">
          <div className="asrv-trade-card__actions">
            {onEdit ? (
              <button
                type="button"
                className="asrv-trade-card__action"
                aria-label={editLabel}
                onClick={onEdit}
              >
                Editar
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="asrv-trade-card__action asrv-trade-card__action--danger"
                aria-label={deleteLabel}
                onClick={onDelete}
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function shortDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value;
}
