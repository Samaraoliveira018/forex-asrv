import { useId } from 'react';
import { classNames } from './classNames';

export interface TextareaProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function Textarea({
  id,
  name,
  label,
  value,
  onChangeText,
  placeholder,
  rows = 2,
  disabled = false,
  className,
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className={classNames('asrv-field', className)}>
      {label ? (
        <label className="asrv-field__label" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        name={name}
        className="asrv-field__textarea"
        value={value}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChangeText?.(event.target.value)}
      />
    </div>
  );
}
