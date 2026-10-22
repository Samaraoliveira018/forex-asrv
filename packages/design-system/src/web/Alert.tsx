import type { ReactNode } from 'react';
import { classNames } from './classNames';

export type AlertTone = 'danger' | 'warning' | 'success';

export interface AlertProps {
  children: ReactNode;
  tone?: AlertTone;
  role?: 'alert' | 'status';
  className?: string;
}

export function Alert({ children, tone = 'danger', role = 'alert', className }: AlertProps) {
  return (
    <div role={role} className={classNames('asrv-alert', `asrv-alert--${tone}`, className)}>
      {children}
    </div>
  );
}
