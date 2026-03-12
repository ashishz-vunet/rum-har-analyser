// ── HAR File Types ──
import type { TraceTreeNode } from '../utils/buildTraceTree';

export interface HarFile {
  log: HarLog;
}

export interface HarLog {
  version: string;
  creator: { name: string; version: string };
  entries: HarEntry[];
  pages?: HarPage[];
}

export interface HarPage {
  startedDateTime: string;
  id: string;
  title: string;
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  timings: HarTimings;
}

export interface HarRequest {
  method: string;
  url: string;
  headers: HarHeader[];
  postData?: { mimeType: string; text: string };
}

export interface HarResponse {
  status: number;
  statusText: string;
  headers: HarHeader[];
  content: { size: number; mimeType: string; text?: string };
}

export interface HarHeader {
  name: string;
  value: string;
}

export interface HarTimings {
  blocked: number;
  dns: number;
  connect: number;
  ssl: number;
  send: number;
  wait: number;
  receive: number;
}

// ── OTLP Trace Types (simplified) ──

export interface OtlpTracePayload {
  resourceSpans: ResourceSpan[];
}

export interface ResourceSpan {
  resource: { attributes: OtlpAttribute[] };
  scopeSpans: ScopeSpan[];
}

export interface ScopeSpan {
  scope: { name: string; version?: string };
  spans: OtlpSpan[];
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
  events: OtlpEvent[];
  status: { code: number };
}

export interface OtlpAttribute {
  key: string;
  value: {
    stringValue?: string;
    intValue?: number;
    doubleValue?: number;
    boolValue?: boolean;
  };
}

export interface OtlpEvent {
  name: string;
  timeUnixNano: string;
  attributes: OtlpAttribute[];
}

// ── OTLP Log Types (simplified) ──

export interface OtlpLogPayload {
  resourceLogs: ResourceLog[];
}

export interface ResourceLog {
  resource: { attributes: OtlpAttribute[] };
  scopeLogs: ScopeLog[];
}

export interface ScopeLog {
  scope: { name: string };
  logRecords: OtlpLogRecord[];
}

export interface OtlpLogRecord {
  timeUnixNano: string;
  severityNumber?: number;
  severityText?: string;
  body?: { stringValue?: string };
  attributes: OtlpAttribute[];
}

// ── Analysis Result Types ──

export type RequestCategory = 'trace' | 'log' | 'replay' | 'other';

export type TagColor = 'blue' | 'green' | 'amber' | 'red' | 'slate';

export interface ContentTag {
  label: string;
  color: TagColor;
  tooltip?: string;
}

export interface CategorizedRequest {
  entry: HarEntry;
  category: RequestCategory;
  contentTags: ContentTag[];
  url: string;
  method: string;
  status: number;
  size: number;
  time: number;
}

export interface OverviewStats {
  totalRequests: number;
  traceRequests: { total: number; success: number; failed: number };
  logRequests: { total: number; success: number; failed: number };
  replayRequests: { total: number; success: number; failed: number };
}

export interface SpanSummary {
  spanId: string;
  parentSpanId: string;
  traceId: string;
  name: string;
  scope: string;
  durationMs: number;
  attributes: Record<string, string | number | boolean>;
  events: { name: string; timeUnixNano: string }[];
}

export interface DocumentLoadAnalysis {
  found: boolean;
  rootSpan: SpanSummary | null;
  childSpans: SpanSummary[];
  allSpanNames: string[];
  orphanedParentIds: string[];
}

export interface WebVitalResult {
  name: string;
  displayName: string;
  found: boolean;
  value: number | null;
  delta: number | null;
  id: string | null;
  unit: string;
}

export interface WebVitalsAnalysis {
  vitals: WebVitalResult[];
  allPresent: boolean;
  source: 'documentLoad.webVitalsChild' | 'documentLoad' | 'otherSpan' | 'none';
}

export interface SpanError {
  message: string;
  count: number;
  samples: string[];
}

export interface SpanErrorsAnalysis {
  errors: SpanError[];
  totalErrors: number;
  hasDoubleEnd: boolean;
  hasTimeoutErrors: boolean;
}

export interface ExportRetry {
  message: string;
  count: number;
}

export interface ExportHealthAnalysis {
  retries: ExportRetry[];
  totalRetries: number;
  successAfterRetry: number;
  timeoutErrors: number;
  healthy: boolean;
}

export interface SessionReplayAnalysis {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalPayloadBytes: number;
  hasSessionDataParam: boolean;
}

export interface OtelAttributeRow {
  key: string;
  count: number;
  isStandard: boolean;
  suggestedStandardKey: string | null;
}

export interface OtelAttributeSummary {
  totalDistinct: number;
  totalOccurrences: number;
  standardCount: number;
  nonStandardCount: number;
}

export interface OtelAttributeAnalysis {
  rows: OtelAttributeRow[];
  qualifiedRows: OtelAttributeRow[];
  summary: OtelAttributeSummary;
  qualifiedSummary: OtelAttributeSummary;
}

export interface FullAnalysis {
  overview: OverviewStats;
  documentLoad: DocumentLoadAnalysis;
  webVitals: WebVitalsAnalysis;
  spanErrors: SpanErrorsAnalysis;
  exportHealth: ExportHealthAnalysis;
  sessionReplay: SessionReplayAnalysis;
  otelAttributes: OtelAttributeAnalysis;
  requests: CategorizedRequest[];
  globalTraceTrees: TraceTreeNode[];
}
