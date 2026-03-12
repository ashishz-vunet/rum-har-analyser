import type { OverviewStats } from '../types/har';

interface OverviewCardsProps {
  stats: OverviewStats;
  fileName: string;
}

function Card({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

export default function OverviewCards({ stats, fileName }: OverviewCardsProps) {
  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        Snapshot extracted from <span className="font-medium text-slate-600">{fileName}</span>
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Total Requests" value={stats.totalRequests} accent="text-slate-800" />
        <Card
          title="Trace Exports"
          value={stats.traceRequests.total}
          subtitle={`${stats.traceRequests.success} ok / ${stats.traceRequests.failed} failed`}
          accent="text-indigo-600"
        />
        <Card
          title="Log Exports"
          value={stats.logRequests.total}
          subtitle={`${stats.logRequests.success} ok / ${stats.logRequests.failed} failed`}
          accent="text-sky-600"
        />
        <Card
          title="Session Replay"
          value={stats.replayRequests.total}
          subtitle={`${stats.replayRequests.success} ok / ${stats.replayRequests.failed} failed`}
          accent="text-violet-600"
        />
      </div>
    </div>
  );
}
