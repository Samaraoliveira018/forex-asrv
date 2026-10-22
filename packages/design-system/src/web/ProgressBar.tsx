import { classNames } from './classNames';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  tone?: 'orange' | 'primary';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'orange',
  className,
}: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={Math.min(max, Math.max(0, value))}
      className={classNames('asrv-progress', tone === 'primary' && 'asrv-progress--primary', className)}
    >
      <div className="asrv-progress__bar" style={{ width: `${percent}%` }} />
    </div>
  );
}
