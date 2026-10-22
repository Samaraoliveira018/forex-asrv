import type { Trade } from '@asrv/backend';

const CHART_COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  muted: '#6b7280',
  grid: '#1f2937',
  label: '#6b7280',
  white: '#f3f4f6',
};

export function EquityChart({
  initialBalance,
  trades,
  hidden = false,
}: {
  initialBalance: number;
  trades: readonly Trade[];
  hidden?: boolean;
}) {
  const values = [initialBalance];
  for (const trade of trades) {
    values.push((values.at(-1) ?? initialBalance) + trade.pnl);
  }

  if (hidden) {
    return (
      <div className="asrv-chart flex min-h-60 items-center justify-center text-sm text-slate-500">
        Valores ocultos
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 24, left: 48 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const min = Math.min(...values, initialBalance);
  const max = Math.max(...values, initialBalance);
  const range = max - min || 1;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : innerWidth;
  const x = (index: number) => padding.left + index * step;
  const y = (value: number) => padding.top + innerHeight - ((value - min) / range) * innerHeight;
  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const area = `${padding.left},${padding.top + innerHeight} ${line} ${x(values.length - 1)},${
    padding.top + innerHeight
  }`;
  const gridValues = [0, 1, 2, 3].map((index) => min + (range / 3) * index);

  return (
    <div className="asrv-chart" role="img" aria-label="Evolução do patrimônio">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="asrv-equity-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.30)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(value)}
              y2={y(value)}
              stroke={CHART_COLORS.grid}
              strokeWidth="1"
            />
            <text x={8} y={y(value) + 4} fill={CHART_COLORS.label} fontSize="10">
              {formatCompact(value)}
            </text>
          </g>
        ))}

        <polygon points={area} fill="url(#asrv-equity-gradient)" />
        <polyline
          points={line}
          fill="none"
          stroke={CHART_COLORS.success}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {values.length <= 30
          ? values.map((value, index) => (
              <circle
                key={`${index}-${value}`}
                cx={x(index)}
                cy={y(value)}
                r="3"
                fill={CHART_COLORS.success}
              />
            ))
          : null}
      </svg>
    </div>
  );
}

export function AssetBarChart({ trades }: { trades: readonly Trade[] }) {
  const counts = new Map<string, number>();
  for (const trade of trades) {
    counts.set(trade.asset, (counts.get(trade.asset) ?? 0) + 1);
  }

  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (entries.length === 0) {
    return (
      <div className="asrv-chart flex min-h-56 items-center justify-center text-sm text-slate-500">
        Nenhum ativo operado ainda.
      </div>
    );
  }

  const max = Math.max(...entries.map(([, count]) => count), 1);
  const width = 640;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 32, left: 32 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const slot = innerWidth / entries.length;
  const barWidth = Math.min(56, slot * 0.55);

  return (
    <div className="asrv-chart" role="img" aria-label="Operações por ativo">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerHeight * ratio}
            y2={padding.top + innerHeight * ratio}
            stroke={CHART_COLORS.grid}
          />
        ))}

        {entries.map(([asset, count], index) => {
          const barHeight = (count / max) * innerHeight;
          const barX = padding.left + slot * index + (slot - barWidth) / 2;
          const barY = padding.top + innerHeight - barHeight;
          return (
            <g key={asset}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                rx="6"
                fill={CHART_COLORS.primary}
              />
              <text
                x={barX + barWidth / 2}
                y={height - 10}
                fill={CHART_COLORS.label}
                fontSize="10"
                textAnchor="middle"
              >
                {asset}
              </text>
              <text
                x={barX + barWidth / 2}
                y={barY - 5}
                fill={CHART_COLORS.white}
                fontSize="10"
                textAnchor="middle"
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  ariaLabel,
}: {
  segments: readonly DonutSegment[];
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const safeSegments = total > 0 ? segments : [{ label: 'Sem dados', value: 1, color: CHART_COLORS.grid }];
  const safeTotal = total > 0 ? total : 1;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div>
      <div className="asrv-chart flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <svg viewBox="0 0 160 160" style={{ maxWidth: 220 }}>
          <circle cx="80" cy="80" r={radius} fill="none" stroke={CHART_COLORS.grid} strokeWidth="22" />
          {safeSegments.map((segment) => {
            const length = (segment.value / safeTotal) * circumference;
            const circle = (
              <circle
                key={segment.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
                strokeLinecap="butt"
              />
            );
            offset += length;
            return circle;
          })}
          <text x="80" y="76" textAnchor="middle" fill={CHART_COLORS.white} fontSize="22" fontWeight="800">
            {total > 0 ? total : 0}
          </text>
          <text x="80" y="94" textAnchor="middle" fill={CHART_COLORS.label} fontSize="10">
            operações
          </text>
        </svg>
      </div>
      <div className="asrv-chart__legend">
        {safeSegments.map((segment) => (
          <span key={segment.label} className="asrv-chart__legend-item">
            <span className="asrv-chart__dot" style={{ backgroundColor: segment.color }} />
            {segment.label} ({segment.value})
          </span>
        ))}
      </div>
    </div>
  );
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}
