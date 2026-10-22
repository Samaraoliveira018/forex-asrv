import { useId } from 'react';
import { classNames } from './classNames';

export type InputType = 'text' | 'email' | 'password' | 'number';

export interface InputProps {
  id?: string;
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  error?: string;
  type?: InputType;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  testID?: string;
  className?: string;
}

export function Input({
  id,
  label,
  value,
  onChangeText,
  error,
  type = 'text',
  placeholder,
  disabled = false,
  autoComplete,
  testID,
  className,
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={classNames('asrv-field', className)}>
      {label ? (
        <label className="asrv-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        data-testid={testID}
        className="asrv-field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChangeText?.(event.target.value)}
      />

      {error ? (
        <p id={errorId} role="alert" className="asrv-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
