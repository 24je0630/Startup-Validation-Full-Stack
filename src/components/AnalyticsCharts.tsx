'use client';

import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

type DailyPoint = { date: string; value: number };
type ActivityPoint = { date: string; votes: number; comments: number; investments: number };

type AnalyticsChartsProps = {
  voteTrend: DailyPoint[];
  investmentTrend: DailyPoint[];
  dailyActivity: ActivityPoint[];
};

// Mirrors the design tokens in tailwind.config.ts — Recharts needs literal
// color values, it can't read Tailwind classes.
const COLORS = {
  signal: '#35D07F',
  alert: '#FF6B4A',
  graphite: '#8A8F98',
  line: '#23272E',
  ink: '#0E1116',
};

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const tooltipStyle = {
  background: COLORS.ink,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 4,
  fontSize: 12,
};

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded border border-line p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-graphite">{title}</p>
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export function AnalyticsCharts({ voteTrend, investmentTrend, dailyActivity }: AnalyticsChartsProps) {
  return (
    <div className="space-y-6">
      <ChartCard title="Vote trend · cumulative score">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={voteTrend} margin={{ left: -20 }}>
            <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              stroke={COLORS.graphite}
              fontSize={11}
              tickMargin={8}
            />
            <YAxis stroke={COLORS.graphite} fontSize={11} />
            <Tooltip labelFormatter={formatDateLabel} contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              name="Score"
              stroke={COLORS.signal}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Investment trend · cumulative credits">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={investmentTrend} margin={{ left: -20 }}>
            <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              stroke={COLORS.graphite}
              fontSize={11}
              tickMargin={8}
            />
            <YAxis stroke={COLORS.graphite} fontSize={11} />
            <Tooltip labelFormatter={formatDateLabel} contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              name="Credits invested"
              stroke={COLORS.signal}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Daily activity · votes, comments, investments">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyActivity} margin={{ left: -20 }}>
            <CartesianGrid stroke={COLORS.line} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              stroke={COLORS.graphite}
              fontSize={11}
              tickMargin={8}
            />
            <YAxis stroke={COLORS.graphite} fontSize={11} allowDecimals={false} />
            <Tooltip labelFormatter={formatDateLabel} contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="votes" name="Votes" stackId="activity" fill={COLORS.signal} />
            <Bar dataKey="comments" name="Comments" stackId="activity" fill={COLORS.graphite} />
            <Bar dataKey="investments" name="Investments" stackId="activity" fill={COLORS.alert} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
