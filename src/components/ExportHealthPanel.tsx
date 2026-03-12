import type { ExportHealthAnalysis } from '../types/har';
import StatusBadge from './StatusBadge';

interface Props {
  data: ExportHealthAnalysis;
}

export default function ExportHealthPanel({ data }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Export Health</h2>
        <StatusBadge
          pass={data.healthy}
          passLabel="Healthy"
          failLabel="Issues detected"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-amber-600">
            {data.totalRetries}
          </p>
          <p className="text-xs text-slate-500">Total retries</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">
            {data.successAfterRetry}
          </p>
          <p className="text-xs text-slate-500">Succeeded after retry</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p
            className={`text-2xl font-bold tabular-nums ${
              data.timeoutErrors > 0 ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {data.timeoutErrors}
          </p>
          <p className="text-xs text-slate-500">Timeout errors</p>
        </div>
      </div>

      {data.retries.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Retry reasons
          </p>
          {data.retries.map((r) => (
            <div
              key={r.message}
              className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2"
            >
              <p className="text-sm text-amber-800">{r.message}</p>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800">
                x{r.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
