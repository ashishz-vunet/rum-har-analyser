import type { CategorizedRequest, OtelAttributeAnalysis } from '../types/har';
import { getPostBody, safeParseJson } from './parseHar';
import { OTEL_SEMCONV_ATTRIBUTE_KEYS } from './otelSemconv';

const PRD_DERIVED_MAPPINGS: Record<string, string> = {
  // HTTP / URL
  'attributes.http.method': 'http.request.method',
  'attributes.http.status_code': 'http.response.status_code',
  'attributes.http.url': 'url.full',
  'attributes.http.scheme': 'url.scheme',
  'attributes.http.host': 'server.address',
  'attributes.http.client_ip': 'client.address',
  'attributes.http.status_text': 'http.response.status_text',
  'attributes.http.action_type': 'rum.http.action_type',
  'http.method': 'http.request.method',
  'http.status_code': 'http.response.status_code',
  'http.url': 'url.full',
  'http.scheme': 'url.scheme',
  'http.host': 'server.address',
  'http.status_text': 'http.response.status_text',
  browser_name: 'user_agent.name',
  'http.response_content_length': 'http.response.body.size',
  'http.user_agent': 'user_agent.original',

  // Session
  rum_session_id: 'session.id',
  'attributes.rum.session_id': 'session.id',
  'location.href': 'url.full',
  'rum.session_id': 'session.id',

  // Browser / User agent / OS
  'attributes.userAgent': 'user_agent.original',
  'attributes.browser_name': 'user_agent.name',
  'attributes.browser_version': 'user_agent.version',
  'attributes.browser_platform': 'browser.platform',
  'attributes.browser_mobile': 'browser.mobile',
  'attributes.os_name': 'os.name',
  'attributes.os_version': 'os.version',
  'attributes.os_description': 'os.description',
  os_name: 'os.name',

  // Geo
  'attributes.geo.city_name': 'client.geo.locality.name',
  'attributes.geo.country_iso_code': 'client.geo.country.iso_code',
  'attributes.geo.region_iso_code': 'client.geo.region.iso_code',
  'attributes.geo.continent_code': 'client.geo.continent.code',
  'attributes.geo.postal_code': 'client.geo.postal_code',
  'attributes.geo.timezone': 'rum.geo.timezone',

  // SDK/app derived fields
  application: 'service.name',
  component: 'otel.component.name',
  event_type: 'event.name',
  'root_span.operation': 'event.name',
  src: 'url.full',
  'vunet.rum.version': 'telemetry.sdk.version',
  'sampling.probability': 'otel.span.sampling_result',

  // Web vitals (PRD-recommended custom extension namespace)
  'rum.web_vital.cls': 'web_vital.cls',
  'rum.web_vital.fcp_ms': 'web_vital.fcp',
  'rum.web_vital.fp_ms': 'web_vital.fp',
  'rum.web_vital.fid_ms': 'web_vital.fid',
  'rum.web_vital.inp_ms': 'web_vital.inp',
  'rum.web_vital.lcp_ms': 'web_vital.lcp',
  'rum.web_vital.ttfb_ms': 'web_vital.ttfb',
  cls: 'web_vital.cls',
  fcp: 'web_vital.fcp',
  fp: 'web_vital.fp',
  fid: 'web_vital.fid',
  inp: 'web_vital.inp',
  lcp: 'web_vital.lcp',
  ttfb: 'web_vital.ttfb',
  cumulativeLayoutShift: 'web_vital.cls_score',
};

const STRIP_PREFIXES = ['root_span.', 'xhr.', 'rum.', 'vunet.'];
const STOPWORDS = new Set(['root', 'span', 'rum', 'vunet', 'event']);
const SEMCONV_ENTRIES = [...OTEL_SEMCONV_ATTRIBUTE_KEYS].map((key) => ({
  key,
  tokens: key
    .split(/[._]/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token)),
}));

function incrementCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toRows(counts: Map<string, number>) {
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      count,
      isStandard: OTEL_SEMCONV_ATTRIBUTE_KEYS.has(key),
      suggestedStandardKey: suggestStandardKey(key),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function toSummary(rows: ReturnType<typeof toRows>) {
  const standardCount = rows.filter((r) => r.isStandard).length;
  return {
    totalDistinct: rows.length,
    totalOccurrences: rows.reduce((sum, row) => sum + row.count, 0),
    standardCount,
    nonStandardCount: rows.length - standardCount,
  };
}

function firstExistingCandidate(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (OTEL_SEMCONV_ATTRIBUTE_KEYS.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function suggestStandardKey(key: string): string | null {
  if (OTEL_SEMCONV_ATTRIBUTE_KEYS.has(key)) {
    return null;
  }

  const directCandidates = [
    key,
    key.replaceAll('_', '.'),
    key.startsWith('attributes.') ? key.slice('attributes.'.length) : key,
  ];
  for (const candidate of directCandidates) {
    const derived = PRD_DERIVED_MAPPINGS[candidate];
    if (derived) {
      return derived;
    }
  }

  const candidates = new Set<string>();
  candidates.add(key.replaceAll('_', '.'));
  candidates.add(key.replaceAll('_', '.').replaceAll('..', '.'));

  for (const prefix of STRIP_PREFIXES) {
    if (!key.startsWith(prefix)) continue;
    const stripped = key.slice(prefix.length);
    candidates.add(stripped);
    candidates.add(stripped.replaceAll('_', '.'));
  }

  const exactCandidate = firstExistingCandidate([...candidates]);
  if (exactCandidate) {
    return exactCandidate;
  }

  const normalized = key.replaceAll('_', '.');
  if (normalized.endsWith('.href') && OTEL_SEMCONV_ATTRIBUTE_KEYS.has('url.full')) {
    return 'url.full';
  }
  if (normalized.endsWith('.session.id') && OTEL_SEMCONV_ATTRIBUTE_KEYS.has('session.id')) {
    return 'session.id';
  }

  const keyTokens = normalized
    .split(/[._]/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));

  if (keyTokens.length === 0) {
    return null;
  }

  const keyTokenSet = new Set(keyTokens);
  const keyRoot = keyTokens[0];
  let best: { candidate: string; score: number } | null = null;

  for (const entry of SEMCONV_ENTRIES) {
    let overlap = 0;
    for (const token of entry.tokens) {
      if (keyTokenSet.has(token)) overlap++;
    }
    if (overlap < 2) continue;

    let score = overlap;
    if (entry.tokens[0] === keyRoot) {
      score += 1;
    }
    // Favor candidates with similar shape to avoid noisy suggestions.
    score -= Math.abs(entry.tokens.length - keyTokens.length) * 0.15;

    if (!best || score > best.score) {
      best = { candidate: entry.key, score };
    }
  }

  if (best && best.score >= 1.9) {
    return best.candidate;
  }

  return null;
}

function collectAttributes(
  payload: unknown,
  rawCounts: Map<string, number>,
  qualifiedCounts: Map<string, number>
) {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      collectAttributes(item, rawCounts, qualifiedCounts);
    }
    return;
  }

  const record = payload as Record<string, unknown>;
  const attrs = record.attributes;

  if (Array.isArray(attrs)) {
    for (const attr of attrs) {
      if (!attr || typeof attr !== 'object') continue;
      const attrKey = (attr as { key?: unknown }).key;
      if (typeof attrKey === 'string' && attrKey.length > 0) {
        incrementCount(rawCounts, attrKey);
        incrementCount(qualifiedCounts, `attributes.${attrKey}`);
      }
    }
  } else if (attrs && typeof attrs === 'object') {
    for (const key of Object.keys(attrs as Record<string, unknown>)) {
      if (key.length > 0) {
        incrementCount(rawCounts, key);
        incrementCount(qualifiedCounts, `attributes.${key}`);
      }
    }
  }

  for (const value of Object.values(record)) {
    collectAttributes(value, rawCounts, qualifiedCounts);
  }
}

export function analyzeOtelAttributes(
  requests: CategorizedRequest[]
): OtelAttributeAnalysis {
  const rawCounts = new Map<string, number>();
  const qualifiedCounts = new Map<string, number>();

  for (const req of requests) {
    const body = getPostBody(req.entry);
    if (!body) continue;

    const payload = safeParseJson<unknown>(body);
    if (!payload) continue;

    collectAttributes(payload, rawCounts, qualifiedCounts);
  }

  const rows = toRows(rawCounts);
  const qualifiedRows = toRows(qualifiedCounts);

  return {
    rows,
    qualifiedRows,
    summary: toSummary(rows),
    qualifiedSummary: toSummary(qualifiedRows),
  };
}
