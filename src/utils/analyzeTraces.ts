import type {
  CategorizedRequest,
  OtlpTracePayload,
  OtlpSpan,
  SpanSummary,
  DocumentLoadAnalysis,
  WebVitalsAnalysis,
  WebVitalResult,
} from '../types/har';
import { getPostBody, safeParseJson } from './parseHar';

const WEB_VITAL_DEFS: { name: string; displayName: string; unit: string }[] = [
  { name: 'fp', displayName: 'First Paint (FP)', unit: 'ms' },
  { name: 'fcp', displayName: 'First Contentful Paint (FCP)', unit: 'ms' },
  { name: 'lcp', displayName: 'Largest Contentful Paint (LCP)', unit: 'ms' },
  { name: 'cls', displayName: 'Cumulative Layout Shift (CLS)', unit: '' },
  { name: 'inp', displayName: 'Interaction to Next Paint (INP)', unit: 'ms' },
  { name: 'fid', displayName: 'First Input Delay (FID)', unit: 'ms' },
  { name: 'ttfb', displayName: 'Time to First Byte (TTFB)', unit: 'ms' },
];

const VITAL_SPAN_NAMES = new Set(['webvitals', 'web-vitals', 'webVitals']);
const RUM_VITAL_KEY_RE = /^vunet\.browser\.web_vital\.([a-z0-9_]+)\.(value|delta|id)$/i;

function toComparableName(name: string): string {
  return name.trim().toLowerCase();
}

function parseVitalAttributes(
  attrs: Record<string, string | number | boolean>
): Map<string, { value?: number; delta?: number; id?: string }> {
  const vitals = new Map<string, { value?: number; delta?: number; id?: string }>();

  for (const [key, raw] of Object.entries(attrs)) {
    const match = key.match(RUM_VITAL_KEY_RE);
    if (!match) continue;

    const metric = match[1].toLowerCase();
    const field = match[2].toLowerCase() as 'value' | 'delta' | 'id';
    const existing = vitals.get(metric) ?? {};

    if (field === 'id' && typeof raw === 'string') {
      existing.id = raw;
    } else if ((field === 'value' || field === 'delta') && typeof raw === 'number') {
      existing[field] = raw;
    }

    vitals.set(metric, existing);
  }

  return vitals;
}

function nanoToMs(nano: string): number {
  return Number(BigInt(nano) / BigInt(1_000_000));
}

export function spanToSummary(span: OtlpSpan, scope: string): SpanSummary {
  const attrs: Record<string, string | number | boolean> = {};
  for (const a of span.attributes) {
    const v = a.value;
    attrs[a.key] =
      v.stringValue ?? v.intValue ?? v.doubleValue ?? v.boolValue ?? '';
  }
  const startMs = nanoToMs(span.startTimeUnixNano);
  const endMs = nanoToMs(span.endTimeUnixNano);
  return {
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    traceId: span.traceId,
    name: span.name,
    scope,
    durationMs: endMs - startMs,
    attributes: attrs,
    events: span.events.map((e) => ({
      name: e.name,
      timeUnixNano: e.timeUnixNano,
    })),
  };
}

export function extractSpansFromPayload(payload: OtlpTracePayload): SpanSummary[] {
  const spans: SpanSummary[] = [];
  if (!payload?.resourceSpans) return spans;
  for (const rs of payload.resourceSpans) {
    for (const ss of rs.scopeSpans) {
      for (const span of ss.spans) {
        spans.push(spanToSummary(span, ss.scope.name));
      }
    }
  }
  return spans;
}

function extractAllSpans(requests: CategorizedRequest[]): SpanSummary[] {
  const spans: SpanSummary[] = [];
  for (const req of requests) {
    if (req.category !== 'trace') continue;
    const body = getPostBody(req.entry);
    if (!body) continue;
    const payload = safeParseJson<OtlpTracePayload>(body);
    if (!payload) continue;
    spans.push(...extractSpansFromPayload(payload));
  }
  return spans;
}

export function analyzeDocumentLoad(
  requests: CategorizedRequest[]
): DocumentLoadAnalysis {
  const allSpans = extractAllSpans(requests);
  const allSpanNames = [...new Set(allSpans.map((s) => s.name))];

  const docLoadSpan = allSpans.find((s) => s.name === 'documentLoad');

  // find children by parentSpanId matching the root span's spanId
  let childSpans: SpanSummary[] = [];
  if (docLoadSpan) {
    childSpans = allSpans.filter(
      (s) => s.parentSpanId === docLoadSpan.spanId && s.spanId !== docLoadSpan.spanId
    );
  }

  // detect orphaned parent IDs (parentSpanIds that don't correspond to any span in the exports)
  const allSpanIds = new Set(allSpans.map((s) => s.spanId));
  const orphanedParentIds = [
    ...new Set(
      allSpans
        .filter((s) => s.parentSpanId && !allSpanIds.has(s.parentSpanId))
        .map((s) => s.parentSpanId)
    ),
  ];

  return {
    found: !!docLoadSpan,
    rootSpan: docLoadSpan ?? null,
    childSpans,
    allSpanNames,
    orphanedParentIds,
  };
}

export function analyzeWebVitals(
  requests: CategorizedRequest[]
): WebVitalsAnalysis {
  const allSpans = extractAllSpans(requests);
  const docLoadSpan = allSpans.find((s) => s.name === 'documentLoad');

  const docLoadChildSpans = docLoadSpan
    ? allSpans.filter((s) => s.parentSpanId === docLoadSpan.spanId)
    : [];
  const webVitalChild = docLoadChildSpans.find((s) =>
    VITAL_SPAN_NAMES.has(toComparableName(s.name))
  );

  const primarySpan =
    webVitalChild ??
    docLoadSpan ??
    allSpans.find((s) => VITAL_SPAN_NAMES.has(toComparableName(s.name))) ??
    null;

  const parsedVitals = primarySpan ? parseVitalAttributes(primarySpan.attributes) : new Map();
  let source: WebVitalsAnalysis['source'] = 'none';

  if (primarySpan) {
    if (webVitalChild && primarySpan.spanId === webVitalChild.spanId) {
      source = 'documentLoad.webVitalsChild';
    } else if (docLoadSpan && primarySpan.spanId === docLoadSpan.spanId) {
      source = 'documentLoad';
    } else {
      source = 'otherSpan';
    }
  }

  const vitals: WebVitalResult[] = WEB_VITAL_DEFS.map((def) => {
    const metric = parsedVitals.get(def.name);
    const value = metric?.value ?? null;
    const delta = metric?.delta ?? null;
    const id = metric?.id ?? null;

    return {
      name: def.name,
      displayName: def.displayName,
      found: value !== null || delta !== null || id !== null,
      value,
      delta,
      id,
      unit: def.unit,
    };
  });

  return {
    vitals,
    allPresent: vitals.every((v) => v.found),
    source,
  };
}
