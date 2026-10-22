import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from './classNames';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: ReactNode;
  onPress?: () => void;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  onPress,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const blocked = disabled || loading;

  return (
    <button
      {...rest}
      type={type}
      disabled={blocked}
      aria-busy={loading || undefined}
      className={classNames(
        'asrv-btn',
        `asrv-btn--${variant}`,
        `asrv-btn--${size}`,
        fullWidth && 'asrv-btn--full',
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!blocked) onPress?.();
      }}
    >
      {children}
    </button>
  );
}
