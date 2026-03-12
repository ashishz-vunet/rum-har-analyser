import type { SpanSummary } from '../types/har';

export interface TraceTreeNode extends SpanSummary {
  children: TraceTreeNode[];
}

export function buildTraceTree(spans: SpanSummary[]): TraceTreeNode[] {
  const spanMap = new Map<string, TraceTreeNode>();
  const roots: TraceTreeNode[] = [];

  // first pass: create nodes
  for (const span of spans) {
    spanMap.set(span.spanId, { ...span, children: [] });
  }

  // second pass: link parents and children
  for (const span of spans) {
    const node = spanMap.get(span.spanId)!;
    if (span.parentSpanId && spanMap.has(span.parentSpanId)) {
      const parent = spanMap.get(span.parentSpanId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // sort children by startTime (optional but recommended)
  // note: startTime is not in SpanSummary yet, but duration and parents are.
  // if we had startTime we'd sort here.

  return roots;
}
