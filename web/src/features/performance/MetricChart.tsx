import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

export interface ChartSeries {
  label: string;
  color: string;
  values: ReadonlyArray<number | null>;
}

export interface MetricChartProps {
  series: readonly ChartSeries[];
  min?: number;
  max?: number;
  className?: string;
}

const WIDTH = 300;
const HEIGHT = 96;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chartPath(values: ReadonlyArray<number | null>, min: number, max: number): string {
  const span = max - min || 1;
  let path = '';
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      drawing = false;
      return;
    }
    const x = values.length <= 1 ? WIDTH / 2 : (index / (values.length - 1)) * WIDTH;
    const y = HEIGHT - (clamp(value, min, max) - min) / span * HEIGHT;
    path += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    drawing = true;
  });
  return path.trim();
}

export function MetricChart({ series, min = 0, max, className }: MetricChartProps) {
  const t = useT();
  const values = series.flatMap(item => item.values).filter((value): value is number => value !== null);
  const auto = max ?? (values.length ? Math.max(...values) * 1.1 : min + 1);
  const top = Math.max(auto, min + 1);
  const hasData = values.length > 0;
  return (
    <div className={cn('relative', className)}>
      <svg
        aria-hidden
        className="h-full w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75].map(ratio => (
          <line
            key={ratio}
            x1={0}
            x2={WIDTH}
            y1={HEIGHT * ratio}
            y2={HEIGHT * ratio}
            stroke="var(--color-line-soft)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="3 5"
          />
        ))}
        {series.map(item => (
          <path
            key={item.label}
            d={chartPath(item.values, min, top)}
            fill="none"
            stroke={item.color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {!hasData ? (
        <span className="absolute inset-0 grid place-items-center text-[11px] text-muted-2">
          {t('performance.chart.waiting')}
        </span>
      ) : null}
    </div>
  );
}
