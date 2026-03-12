import type { SpanErrorsAnalysis } from '../types/har';
import StatusBadge from './StatusBadge';

interface Props {
  data: SpanErrorsAnalysis;
}

export default function SpanErrorsPanel({ data }: Props) {
  const clean = data.totalErrors === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Span Errors</h2>
        <StatusBadge
          pass={clean}
          passLabel="No errors"
          failLabel={`${data.totalErrors} error${data.totalErrors !== 1 ? 's' : ''}`}
        />
      </div>

      {clean ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            No span lifecycle errors detected in log exports.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Error details
          </p>
          {data.errors.map((err) => (
            <div
              key={err.message}
              className="rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-red-800">
                  {err.message}
                </p>
                <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-bold text-red-800">
                  x{err.count}
                </span>
              </div>
              {err.samples.length > 0 && (
                <div className="mt-2 space-y-1">
                  {err.samples.map((s, i) => (
                    <p key={i} className="break-all text-xs text-red-600">
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
