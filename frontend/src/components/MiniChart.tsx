import React, { useMemo } from 'react';

interface MiniChartProps {
  data: number[];
  color: string;
  height?: number;
  showGradient?: boolean;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, height = 52, showGradient = true }) => {
  const points = useMemo(() => {
    if (!data || data.length < 2) return { line: '', area: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 0.0001;
    const w = 100;
    const h = height;
    const pad = 3;

    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });

    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const area = line + ` L${w},${h} L0,${h} Z`;

    return { line, area, pts };
  }, [data, height]);

  if (!data || data.length < 2) {
    return (
      <div className="agent-chart-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 2 }}>NO DATA</span>
      </div>
    );
  }

  const isUp = data[data.length - 1] >= data[0];
  const chartColor = isUp ? color : 'var(--accent-red)';
  const gradientId = `grad-${color.replace('#', '')}`;

  return (
    <div className="agent-chart-area">
      <div className="chart-overlay" />
      <svg
        className="sparkline-svg"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          {showGradient && (
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0.02" />
            </linearGradient>
          )}
        </defs>

        {showGradient && (
          <path d={points.area} fill={`url(#${gradientId})`} />
        )}

        <path
          d={points.line}
          fill="none"
          stroke={chartColor}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 2px ${chartColor})` }}
        />

        {/* Last point dot */}
        {points.pts && points.pts.length > 0 && (
          <circle
            cx={points.pts[points.pts.length - 1][0]}
            cy={points.pts[points.pts.length - 1][1]}
            r="2"
            fill={chartColor}
            style={{ filter: `drop-shadow(0 0 3px ${chartColor})` }}
          />
        )}
      </svg>
    </div>
  );
};

export default MiniChart;
