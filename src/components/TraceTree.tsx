import { useState } from 'react';
import type { TraceTreeNode } from '../utils/buildTraceTree';

interface Props {
  nodes: TraceTreeNode[];
  depth?: number;
}

function flattenNodes(nodes: TraceTreeNode[]): TraceTreeNode[] {
  const out: TraceTreeNode[] = [];
  for (const node of nodes) {
    out.push(node);
    out.push(...flattenNodes(node.children));
  }
  return out;
}

function SpanNode({
  node,
  depth = 0,
  spanById,
}: {
  node: TraceTreeNode;
  depth: number;
  spanById: Map<string, TraceTreeNode>;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const hasChildren = node.children.length > 0;
  const hasParent = !!node.parentSpanId;
  const parentSpan = hasParent ? spanById.get(node.parentSpanId) : undefined;
  const attrEntries = Object.entries(node.attributes);

  return (
    <div className="flex flex-col">
      <div
        className={`flex cursor-pointer items-start gap-2 rounded-md px-3 py-2 transition-colors hover:bg-slate-50 ${
          depth > 0 ? 'ml-6 border-l-2 border-slate-100' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <svg
              className={`h-3 w-3 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          ) : (
            <div className="w-3" />
          )}
          <span className="font-mono text-[11px] font-semibold text-indigo-600 truncate">
            {node.name}
          </span>
          <span className="truncate font-mono text-[10px] text-slate-500">
            spanId: {node.spanId}
          </span>
          <span className="truncate font-mono text-[10px] text-slate-400">
            parent: {hasParent ? node.parentSpanId : '--'}
          </span>
        </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              scope: {node.scope || '--'}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              attrs: {attrEntries.length}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              events: {node.events.length}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              children: {node.children.length}
            </span>
          </div>
        </div>

        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {node.durationMs.toFixed(1)}ms
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails((v) => !v);
            }}
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              showDetails
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {showDetails ? 'Hide details' : 'Details'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className={`pb-2 ${depth > 0 ? 'ml-6 pl-4' : 'px-3'}`}>
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-500">traceId:</span>{' '}
                <span className="font-mono break-all">{node.traceId}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-500">scope:</span>{' '}
                <span className="font-mono">{node.scope || '--'}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-500">spanId:</span>{' '}
                <span className="font-mono break-all">{node.spanId}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-500">parent:</span>{' '}
                <span className="font-mono break-all">{node.parentSpanId || '--'}</span>
              </p>
              {hasParent && (
                <p className="sm:col-span-2">
                  <span className="font-semibold text-slate-500">parent name:</span>{' '}
                  <span className="font-mono">{parentSpan?.name || 'not found'}</span>
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Attributes ({attrEntries.length})
              </p>
              <div className="max-h-36 overflow-auto rounded border border-slate-200 bg-white p-2">
                {attrEntries.length > 0 ? (
                  <div className="space-y-1">
                    {attrEntries.map(([k, v]) => (
                      <p key={k} className="break-all font-mono text-[10px] text-slate-700">
                        <span className="font-semibold text-slate-500">{k}</span>: {String(v)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">No attributes</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Events ({node.events.length})
              </p>
              <div className="max-h-28 overflow-auto rounded border border-slate-200 bg-white p-2">
                {node.events.length > 0 ? (
                  <div className="space-y-1">
                    {node.events.map((evt, idx) => (
                      <p key={`${evt.name}-${idx}`} className="break-all font-mono text-[10px] text-slate-700">
                        {evt.name}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">No events</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isExpanded && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <SpanNode
              key={child.spanId}
              node={child}
              depth={depth + 1}
              spanById={spanById}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TraceTree({ nodes }: Props) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <svg className="h-10 w-10 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.971 5.971 0 00-.941 3.197m0 0L6 18.72m12-1.801A11.952 11.952 0 0012 10.5c-2.259 0-4.331.626-6.098 1.719m12 0a11.969 11.969 0 01-1.2 6.212m-9.7-6.212a11.969 11.969 0 001.2 6.212M12 10.5V6.75m0 0l3.75 3.75M12 6.75L8.25 10.5" />
        </svg>
        <p className="text-sm">No span data available for this trace</p>
      </div>
    );
  }

  const spanById = new Map(flattenNodes(nodes).map((node) => [node.spanId, node]));

  return (
    <div className="flex flex-col divide-y divide-slate-50">
      {nodes.map((node) => (
        <SpanNode key={node.spanId} node={node} depth={0} spanById={spanById} />
      ))}
    </div>
  );
}
