import { useId, type ReactNode } from 'react';
import { classNames } from './classNames';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  disabled?: boolean;
  error?: string;
  className?: string;
  children?: ReactNode;
}

export function Select({
  id,
  name,
  label,
  value,
  onChange,
  options,
  disabled = false,
  error,
  className,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={classNames('asrv-field', className)}>
      {label ? (
        <label className="asrv-field__label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}

      <select
        id={selectId}
        name={name}
        className="asrv-field__select"
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} role="alert" className="asrv-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
