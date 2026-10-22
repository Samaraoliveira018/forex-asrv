import type { ReactNode } from 'react';
import { classNames } from './classNames';

export interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

export function EmptyState({ children, className }: EmptyStateProps) {
  return <div className={classNames('asrv-empty', className)}>{children}</div>;
}
