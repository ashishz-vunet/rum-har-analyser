import type { WebVitalsAnalysis } from '../types/har';
import StatusBadge from './StatusBadge';

interface Props {
  data: WebVitalsAnalysis;
  embedded?: boolean;
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '--';
  if (unit === 'ms') return `${value.toFixed(1)} ms`;
  return value.toFixed(4);
}

function formatDelta(delta: number | null, unit: string): string {
  if (delta === null) return '--';
  if (unit === 'ms') return `${delta.toFixed(1)} ms`;
  return delta.toFixed(4);
}

export default function WebVitalsPanel({ data, embedded = false }: Props) {
  return (
    <div
      className={
        embedded
          ? 'rounded-lg border border-slate-200 bg-slate-50/50 p-4'
          : 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Web Vitals</h2>
        <StatusBadge
          pass={data.allPresent}
          passLabel="All present"
          failLabel="Some missing"
        />
      </div>

      {data.source !== 'none' && (
        <p className="mb-4 text-xs text-slate-400">
          Source:{' '}
          <span className="font-medium text-slate-600">
            {data.source === 'documentLoad.webVitalsChild'
              ? 'documentLoad -> webVitals child span'
              : data.source}
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.vitals.map((vital) => (
          <div
            key={vital.name}
            className={`rounded-lg border p-4 ${
              vital.found ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <p
                className={`text-sm font-semibold ${
                  vital.found ? 'text-emerald-800' : 'text-red-700'
                }`}
              >
                {vital.displayName}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  vital.found ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {vital.found ? 'Found' : 'Missing'}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-baseline justify-between gap-3 rounded bg-white/70 px-2 py-1.5">
                <dt className="font-medium text-slate-500">Value</dt>
                <dd className="font-mono text-slate-800">{formatValue(vital.value, vital.unit)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 rounded bg-white/70 px-2 py-1.5">
                <dt className="font-medium text-slate-500">Delta</dt>
                <dd className="font-mono text-slate-800">{formatDelta(vital.delta, vital.unit)}</dd>
              </div>
              <div className="rounded bg-white/70 px-2 py-1.5">
                <dt className="mb-1 font-medium text-slate-500">ID</dt>
                <dd className="break-all font-mono text-slate-700">{vital.id ?? '--'}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
