import type {
  HarEntry,
  RequestCategory,
  ContentTag,
  OtlpTracePayload,
  OtlpLogPayload,
} from '../types/har';
import { getPostBody, safeParseJson } from './parseHar';

const WEB_VITAL_NAMES = new Set(['fp', 'fcp', 'lcp', 'cls', 'fid', 'ttfb']);

const HTTP_SPAN_NAMES = new Set([
  'XMLHttpRequest',
  'fetch',
  'HTTP GET',
  'HTTP POST',
  'HTTP PUT',
  'HTTP DELETE',
  'HTTP PATCH',
]);

const RESOURCE_SPAN_NAMES = new Set([
  'resourceFetch',
  'resourceLoad',
  'resource',
]);

const ERROR_PATTERNS = [
  'Cannot execute the operation on ended Span',
  'You can only call end() on a span once',
];

const TIMEOUT_PATTERNS = [
  'remaining timeout',
  'Export retry time',
  'not retrying further',
];

const RETRY_PATTERNS = [
  'Scheduling export retry',
  'Export succeeded after',
];

const MIME_CATEGORIES: [RegExp, string][] = [
  [/javascript|ecmascript/, 'Script'],
  [/css/, 'CSS'],
  [/image\//, 'Image'],
  [/font/, 'Font'],
  [/html/, 'HTML'],
  [/json/, 'JSON'],
  [/xml/, 'XML'],
];

const EXT_CATEGORIES: Record<string, string> = {
  '.js': 'Script',
  '.mjs': 'Script',
  '.css': 'CSS',
  '.png': 'Image',
  '.jpg': 'Image',
  '.jpeg': 'Image',
  '.gif': 'Image',
  '.svg': 'Image',
  '.webp': 'Image',
  '.ico': 'Image',
  '.woff': 'Font',
  '.woff2': 'Font',
  '.ttf': 'Font',
  '.eot': 'Font',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectTraceTags(entry: HarEntry): ContentTag[] {
  const tags: ContentTag[] = [];
  const body = getPostBody(entry);
  if (!body) return tags;

  const payload = safeParseJson<OtlpTracePayload>(body);
  if (!payload?.resourceSpans) return tags;

  let spanCount = 0;
  let hasDocumentLoad = false;
  const foundVitals = new Set<string>();
  let hasHttp = false;
  let hasResource = false;
  const spanNames = new Set<string>();

  for (const rs of payload.resourceSpans) {
    for (const ss of rs.scopeSpans) {
      for (const span of ss.spans) {
        spanCount++;
        spanNames.add(span.name);

        if (span.name === 'documentLoad') {
          hasDocumentLoad = true;
        }

        if (HTTP_SPAN_NAMES.has(span.name) || span.name.startsWith('HTTP ')) {
          hasHttp = true;
        }

        if (RESOURCE_SPAN_NAMES.has(span.name)) {
          hasResource = true;
        }

        for (const evt of span.events ?? []) {
          if (WEB_VITAL_NAMES.has(evt.name)) {
            foundVitals.add(evt.name);
          }
        }
        for (const attr of span.attributes ?? []) {
          if (WEB_VITAL_NAMES.has(attr.key)) {
            foundVitals.add(attr.key);
          }
        }
      }
    }
  }

  if (hasDocumentLoad) {
    tags.push({
      label: 'documentLoad',
      color: 'blue',
      tooltip: 'Contains the documentLoad root span',
    });
  }

  if (foundVitals.size > 0) {
    const vitals = [...foundVitals].sort().join(', ').toUpperCase();
    tags.push({
      label: 'Web Vitals',
      color: 'blue',
      tooltip: `Contains: ${vitals}`,
    });
  }

  if (hasHttp) {
    tags.push({
      label: 'HTTP',
      color: 'blue',
      tooltip: 'Contains XMLHttpRequest or fetch spans',
    });
  }

  if (hasResource) {
    tags.push({
      label: 'Resource',
      color: 'blue',
      tooltip: 'Contains resource loading spans',
    });
  }

  if (spanCount > 0) {
    tags.push({
      label: `${spanCount} span${spanCount !== 1 ? 's' : ''}`,
      color: 'green',
      tooltip: `Span names: ${[...spanNames].join(', ')}`,
    });
  }

  return tags;
}

function detectLogTags(entry: HarEntry): ContentTag[] {
  const tags: ContentTag[] = [];
  const body = getPostBody(entry);
  if (!body) return tags;

  const payload = safeParseJson<OtlpLogPayload>(body);
  if (!payload?.resourceLogs) return tags;

  let logCount = 0;
  let hasSpanError = false;
  let hasTimeout = false;
  let hasRetry = false;

  for (const rl of payload.resourceLogs) {
    for (const sl of rl.scopeLogs) {
      for (const rec of sl.logRecords) {
        logCount++;
        const msg = rec.body?.stringValue ?? '';

        if (!hasSpanError && ERROR_PATTERNS.some((p) => msg.includes(p))) {
          hasSpanError = true;
        }
        if (!hasTimeout && TIMEOUT_PATTERNS.some((p) => msg.includes(p))) {
          hasTimeout = true;
        }
        if (!hasRetry && RETRY_PATTERNS.some((p) => msg.includes(p))) {
          hasRetry = true;
        }
      }
    }
  }

  if (hasSpanError) {
    tags.push({
      label: 'Span Error',
      color: 'red',
      tooltip: 'Contains span lifecycle errors (double-end / ended span)',
    });
  }

  if (hasTimeout) {
    tags.push({
      label: 'Timeout',
      color: 'amber',
      tooltip: 'Contains export timeout errors',
    });
  }

  if (hasRetry) {
    tags.push({
      label: 'Retry',
      color: 'amber',
      tooltip: 'Contains export retry scheduling messages',
    });
  }

  if (logCount > 0) {
    tags.push({
      label: `${logCount} log${logCount !== 1 ? 's' : ''}`,
      color: 'green',
      tooltip: `Contains ${logCount} log record(s)`,
    });
  }

  return tags;
}

function detectReplayTags(entry: HarEntry): ContentTag[] {
  const tags: ContentTag[] = [];

  if (entry.request.url.includes('sessionData=')) {
    tags.push({
      label: 'Session Data',
      color: 'blue',
      tooltip: 'Contains sessionData query parameter',
    });
  }

  const bodyText = entry.request.postData?.text;
  if (bodyText) {
    const size = new Blob([bodyText]).size;
    tags.push({
      label: `${formatSize(size)} payload`,
      color: 'green',
      tooltip: `Request body is ${formatSize(size)}`,
    });
  }

  return tags;
}

function detectOtherTags(entry: HarEntry): ContentTag[] {
  const tags: ContentTag[] = [];
  const mime = entry.response.content.mimeType ?? '';
  const url = entry.request.url;

  for (const [regex, label] of MIME_CATEGORIES) {
    if (regex.test(mime)) {
      tags.push({ label, color: 'slate', tooltip: `MIME: ${mime}` });
      return tags;
    }
  }

  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.slice(pathname.lastIndexOf('.')).toLowerCase();
    const label = EXT_CATEGORIES[ext];
    if (label) {
      tags.push({ label, color: 'slate', tooltip: `Extension: ${ext}` });
    }
  } catch {
    // invalid URL, skip
  }

  return tags;
}

export function detectContentTags(
  entry: HarEntry,
  category: RequestCategory,
): ContentTag[] {
  switch (category) {
    case 'trace':
      return detectTraceTags(entry);
    case 'log':
      return detectLogTags(entry);
    case 'replay':
      return detectReplayTags(entry);
    case 'other':
      return detectOtherTags(entry);
  }
}
