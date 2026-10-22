import type { ReactNode } from 'react';
import { classNames } from './classNames';

export interface NavItemProps {
  children: ReactNode;
  active?: boolean;
  icon?: ReactNode;
  onClick: () => void;
  className?: string;
}

export function NavItem({ children, active = false, icon, onClick, className }: NavItemProps) {
  return (
    <button
      type="button"
      className={classNames('asrv-nav-item', active && 'is-active', className)}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
}
