import type { DocumentLoadAnalysis, WebVitalsAnalysis } from '../types/har';
import StatusBadge from './StatusBadge';
import WebVitalsPanel from './WebVitalsPanel';

interface Props {
  data: DocumentLoadAnalysis;
  webVitals?: WebVitalsAnalysis;
}

export default function DocumentLoadPanel({ data, webVitals }: Props) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">
          documentLoad Span
        </h2>
        <StatusBadge
          pass={data.found}
          passLabel="Found"
          failLabel="Missing"
        />
      </div>

      {!data.found && (
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            The documentLoad root span was not found in any trace export.
          </p>
          {data.orphanedParentIds.length > 0 && (
            <p className="mt-2 text-xs text-red-600">
              Orphaned parent IDs (child spans reference these missing
              parents):{' '}
              <code className="break-all">
                {data.orphanedParentIds.join(', ')}
              </code>
            </p>
          )}
        </div>
      )}

      {data.found && data.rootSpan && (
        <div className="mb-4 space-y-2 rounded-lg bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Trace ID:</span>{' '}
            <code className="text-xs">{data.rootSpan.traceId}</code>
          </p>
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Span ID:</span>{' '}
            <code className="text-xs">{data.rootSpan.spanId}</code>
          </p>
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Duration:</span>{' '}
            {data.rootSpan.durationMs.toFixed(1)} ms
          </p>
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Child spans:</span>{' '}
            {data.childSpans.length}
          </p>
          {data.rootSpan.events.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-emerald-700">
                Events on span:
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {data.rootSpan.events.map((e, i) => (
                  <span
                    key={i}
                    className="rounded bg-emerald-200 px-2 py-0.5 text-xs text-emerald-800"
                  >
                    {e.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          All span names in trace exports
        </p>
        <div className="flex flex-wrap gap-2">
          {data.allSpanNames.map((name) => (
            <span
              key={name}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                name === 'documentLoad'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {name}
            </span>
          ))}
          {data.allSpanNames.length === 0 && (
            <span className="text-xs text-slate-400">No spans found</span>
          )}
        </div>
      </div>

      {webVitals && (
        <div className="border-t border-slate-100 pt-4">
          <WebVitalsPanel data={webVitals} embedded />
        </div>
      )}
    </div>
  );
}
