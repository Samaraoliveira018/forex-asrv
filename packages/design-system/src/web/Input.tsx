import { useId } from 'react';
import { classNames } from './classNames';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'date' | 'search';

export interface InputProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  type?: InputType;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'search';
  ariaLabel?: string;
  testID?: string;
  className?: string;
}

export function Input({
  id,
  name,
  label,
  value,
  onChangeText,
  onBlur,
  error,
  hint,
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  readOnly = false,
  autoComplete,
  autoFocus = false,
  min,
  max,
  step,
  inputMode,
  ariaLabel,
  testID,
  className,
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={classNames('asrv-field', className)}>
      {label ? (
        <label className="asrv-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        name={name}
        data-testid={testID}
        className="asrv-field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChangeText?.(event.target.value)}
        onBlur={onBlur}
      />

      {error ? (
        <p id={errorId} role="alert" className="asrv-field__error">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="asrv-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
