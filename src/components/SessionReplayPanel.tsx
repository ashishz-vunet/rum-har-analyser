import type { SessionReplayAnalysis } from '../types/har';
import StatusBadge from './StatusBadge';

interface Props {
  data: SessionReplayAnalysis;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function SessionReplayPanel({ data }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Session Replay</h2>
        <StatusBadge
          pass={data.hasSessionDataParam && data.totalRequests > 0}
          passLabel="Active"
          failLabel={data.totalRequests === 0 ? 'No data' : 'Missing ?sessionData='}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-violet-700">
            {data.totalRequests}
          </p>
          <p className="text-xs text-slate-500">Total requests</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-600">
            {data.successRequests}
          </p>
          <p className="text-xs text-slate-500">Successful</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <p
            className={`text-2xl font-bold tabular-nums ${
              data.failedRequests > 0 ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {data.failedRequests}
          </p>
          <p className="text-xs text-slate-500">Failed</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-slate-700">
            {formatBytes(data.totalPayloadBytes)}
          </p>
          <p className="text-xs text-slate-500">Total payload</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-slate-500">?sessionData= parameter:</span>
        <StatusBadge
          pass={data.hasSessionDataParam}
          passLabel="Present"
          failLabel="Missing"
        />
      </div>
    </div>
  );
}
