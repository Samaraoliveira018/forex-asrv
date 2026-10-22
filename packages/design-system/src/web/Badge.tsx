import type { ReactNode } from 'react';
import { classNames } from './classNames';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'orange';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  pill?: boolean;
  className?: string;
}

export function Badge({ children, tone = 'neutral', pill = false, className }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={classNames(
        'asrv-badge',
        `asrv-badge--${tone}`,
        pill && 'asrv-badge--pill',
        className,
      )}
    >
      {children}
    </span>
  );
}
