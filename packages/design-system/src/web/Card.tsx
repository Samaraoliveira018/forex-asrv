import type { ReactNode } from 'react';
import { classNames } from './classNames';

export type CardTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface CardProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  tone?: CardTone;
  flush?: boolean;
}

export function Card({
  children,
  className,
  ariaLabel,
  tone = 'default',
  flush = false,
}: CardProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={classNames(
        'asrv-card',
        tone !== 'default' && `asrv-card--${tone}`,
        flush && 'asrv-card--flush',
        className,
      )}
    >
      {children}
    </section>
  );
}
