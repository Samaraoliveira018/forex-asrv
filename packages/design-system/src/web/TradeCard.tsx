import { classNames } from './classNames';
import { Badge } from './Badge';

export type TradeDirection = 'Compra' | 'Venda';

export interface TradeCardProps {
  asset: string;
  date: string;
  type: TradeDirection;
  lots: number;
  pnl: number;
  notes?: string;
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
  lots,
  pnl,
  notes,
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

  return (
    <article className={classNames('asrv-trade-card', className)}>
      <div className="asrv-trade-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="asrv-trade-card__asset">{asset}</span>
          <Badge tone={type === 'Compra' ? 'success' : 'danger'}>{type}</Badge>
          {breakEven ? <Badge tone="neutral">BREAK EVEN</Badge> : null}
        </div>
        <span className="asrv-trade-card__date">{date}</span>
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
