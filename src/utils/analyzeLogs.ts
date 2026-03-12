import type {
  CategorizedRequest,
  OtlpLogPayload,
  SpanError,
  SpanErrorsAnalysis,
  ExportRetry,
  ExportHealthAnalysis,
} from '../types/har';
import { getPostBody, safeParseJson } from './parseHar';

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
  { pattern: /Scheduling export retry/g, label: 'Scheduling export retry' },
  { pattern: /Export succeeded after \d+ retry/g, label: 'Export succeeded after retry' },
];

function extractAllLogBodies(requests: CategorizedRequest[]): string[] {
  const bodies: string[] = [];
  for (const req of requests) {
    if (req.category !== 'log') continue;
    const body = getPostBody(req.entry);
    if (!body) continue;
    const payload = safeParseJson<OtlpLogPayload>(body);
    if (!payload?.resourceLogs) {
      bodies.push(body);
      continue;
    }
    for (const rl of payload.resourceLogs) {
      for (const sl of rl.scopeLogs) {
        for (const rec of sl.logRecords) {
          if (rec.body?.stringValue) {
            bodies.push(rec.body.stringValue);
          }
        }
      }
    }
  }
  return bodies;
}

export function analyzeSpanErrors(
  requests: CategorizedRequest[]
): SpanErrorsAnalysis {
  const logBodies = extractAllLogBodies(requests);

  const errorMap = new Map<string, { count: number; samples: string[] }>();

  for (const msg of logBodies) {
    for (const pattern of ERROR_PATTERNS) {
      if (msg.includes(pattern)) {
        const existing = errorMap.get(pattern) ?? { count: 0, samples: [] };
        existing.count++;
        if (existing.samples.length < 3) {
          existing.samples.push(
            msg.length > 200 ? msg.slice(0, 200) + '...' : msg
          );
        }
        errorMap.set(pattern, existing);
      }
    }
    for (const pattern of TIMEOUT_PATTERNS) {
      if (msg.includes(pattern)) {
        const existing = errorMap.get(pattern) ?? { count: 0, samples: [] };
        existing.count++;
        if (existing.samples.length < 3) {
          existing.samples.push(
            msg.length > 200 ? msg.slice(0, 200) + '...' : msg
          );
        }
        errorMap.set(pattern, existing);
      }
    }
  }

  const errors: SpanError[] = Array.from(errorMap.entries()).map(
    ([message, data]) => ({
      message,
      count: data.count,
      samples: data.samples,
    })
  );

  return {
    errors,
    totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
    hasDoubleEnd: errors.some(
      (e) =>
        e.message.includes('ended Span') ||
        e.message.includes('end() on a span once')
    ),
    hasTimeoutErrors: errors.some(
      (e) =>
        e.message.includes('remaining timeout') ||
        e.message.includes('not retrying further')
    ),
  };
}

export function analyzeExportHealth(
  requests: CategorizedRequest[]
): ExportHealthAnalysis {
  const logBodies = extractAllLogBodies(requests);
  const fullText = logBodies.join('\n');

  const retries: ExportRetry[] = [];
  let totalRetries = 0;
  let successAfterRetry = 0;
  let timeoutErrors = 0;

  for (const { pattern, label } of RETRY_PATTERNS) {
    const matches = fullText.match(pattern);
    const count = matches?.length ?? 0;
    if (count > 0) {
      retries.push({ message: label, count });
      if (label.includes('Scheduling')) totalRetries += count;
      if (label.includes('succeeded')) successAfterRetry += count;
    }
  }

  for (const pattern of TIMEOUT_PATTERNS) {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = fullText.match(regex);
    timeoutErrors += matches?.length ?? 0;
  }

  return {
    retries,
    totalRetries,
    successAfterRetry,
    timeoutErrors,
    healthy: timeoutErrors === 0 && totalRetries <= successAfterRetry,
  };
}
