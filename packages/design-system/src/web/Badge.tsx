import type { ReactNode } from 'react';
import { classNames } from './classNames';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span data-tone={tone} className={classNames('asrv-badge', `asrv-badge--${tone}`, className)}>
      {children}
    </span>
  );
}
