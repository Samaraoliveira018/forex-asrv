import type { ReactNode } from 'react';
import { classNames } from './classNames';
import { Card } from './Card';

export type StatTone = 'default' | 'success' | 'danger' | 'muted';

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  hintTone?: 'default' | 'success' | 'danger';
  icon?: ReactNode;
  tone?: StatTone;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  hintTone = 'default',
  icon,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={className}>
      <div className="asrv-stat">
        <div className="asrv-stat__top">
          <p className="asrv-stat__label">{label}</p>
          {icon ? <span className="asrv-stat__icon">{icon}</span> : null}
        </div>
        <p
          className={classNames(
            'asrv-stat__value',
            tone !== 'default' && `asrv-stat__value--${tone}`,
          )}
        >
          {value}
        </p>
        {hint ? (
          <p
            className={classNames(
              'asrv-stat__hint',
              hintTone !== 'default' && `asrv-stat__hint--${hintTone}`,
            )}
          >
            {hint}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
