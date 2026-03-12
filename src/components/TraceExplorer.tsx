import type { TraceTreeNode } from '../utils/buildTraceTree';
import TraceTree from './TraceTree';

interface Props {
  trees: TraceTreeNode[];
}

function flattenTrace(node: TraceTreeNode): TraceTreeNode[] {
  const out: TraceTreeNode[] = [node];
  for (const child of node.children) {
    out.push(...flattenTrace(child));
  }
  return out;
}

function getMaxDepth(node: TraceTreeNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(getMaxDepth));
}

export default function TraceExplorer({ trees }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-800">
          Global Trace Explorer
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({trees.length} Root Traces)
          </span>
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Visualizing end-to-end propagation across all captured trace exports.
        </p>
      </div>

      <div className="max-h-[860px] overflow-auto p-4">
        {trees.length > 0 ? (
          trees.map((root, i) => {
            const allSpans = flattenTrace(root);
            const maxDepth = getMaxDepth(root);
            const totalEvents = allSpans.reduce((sum, span) => sum + span.events.length, 0);
            const totalAttributes = allSpans.reduce(
              (sum, span) => sum + Object.keys(span.attributes).length,
              0
            );
            const slowest = [...allSpans]
              .sort((a, b) => b.durationMs - a.durationMs)
              .slice(0, 5);

            return (
            <div
              key={root.spanId + i}
              className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm last:mb-0"
            >
              <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 to-white px-4 py-3">
                <div className="mb-2 flex items-center gap-3">
                  <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Trace {i + 1}
                  </span>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                    Root: {root.name}
                  </span>
                </div>
                <code className="block rounded bg-white px-2 py-1 text-[10px] font-mono text-slate-500 ring-1 ring-slate-200">
                  {root.traceId}
                </code>
              </div>

              <div className="bg-slate-50/40 p-4">
              <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
                <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums text-slate-700">{allSpans.length}</p>
                  <p className="text-[10px] text-slate-500">spans</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums text-slate-700">{maxDepth + 1}</p>
                  <p className="text-[10px] text-slate-500">levels</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums text-slate-700">{totalEvents}</p>
                  <p className="text-[10px] text-slate-500">events</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums text-slate-700">{totalAttributes}</p>
                  <p className="text-[10px] text-slate-500">attributes</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-2 py-1.5 text-center">
                  <p className="truncate text-xs font-semibold text-slate-700">{root.name}</p>
                  <p className="text-[10px] text-slate-500">root span</p>
                </div>
              </div>

              <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Top slow spans
                </p>
                <div className="space-y-1">
                  {slowest.map((span) => (
                    <div
                      key={span.spanId}
                      className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[10px]"
                    >
                      <span className="truncate font-mono text-slate-700">{span.name}</span>
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 font-semibold tabular-nums text-slate-700">
                        {span.durationMs.toFixed(1)}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                <TraceTree nodes={[root]} />
              </div>
              </div>
            </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="h-12 w-12 mb-4 opacity-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <p className="text-sm font-medium">No traces found in this HAR file.</p>
            <p className="text-xs">Ensure your RUM SDK is exporting traces and that they are captured in the HAR.</p>
          </div>
        )}
      </div>
    </div>
  );
}
