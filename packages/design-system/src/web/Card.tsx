import type { ReactNode } from 'react';
import { classNames } from './classNames';

export interface CardProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Card({ children, className, ariaLabel }: CardProps) {
  return (
    <section aria-label={ariaLabel} className={classNames('asrv-card', className)}>
      {children}
    </section>
  );
}
