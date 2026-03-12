import type {
  HarFile,
  HarEntry,
  CategorizedRequest,
  RequestCategory,
  OverviewStats,
} from '../types/har';
import { detectContentTags } from './detectContentTags';

export function categorizeEntry(entry: HarEntry): RequestCategory {
  const url = entry.request.url;
  if (url.includes('v1/traces')) return 'trace';
  if (url.includes('v1/logs') && url.includes('sessionData')) return 'replay';
  if (url.includes('v1/logs')) return 'log';
  return 'other';
}

export function parseHarFile(text: string): HarFile {
  return JSON.parse(text) as HarFile;
}

export function categorizeRequests(entries: HarEntry[]): CategorizedRequest[] {
  return entries.map((entry) => {
    const category = categorizeEntry(entry);
    return {
      entry,
      category,
      contentTags: detectContentTags(entry, category),
      url: entry.request.url,
      method: entry.request.method,
      status: entry.response.status,
      size: entry.response.content.size,
      time: entry.time,
    };
  });
}

export function computeOverview(requests: CategorizedRequest[]): OverviewStats {
  const traces = requests.filter((r) => r.category === 'trace');
  const logs = requests.filter((r) => r.category === 'log');
  const replays = requests.filter((r) => r.category === 'replay');

  const countGroup = (items: CategorizedRequest[]) => ({
    total: items.length,
    success: items.filter((r) => r.status >= 200 && r.status < 300).length,
    failed: items.filter((r) => r.status < 200 || r.status >= 300).length,
  });

  return {
    totalRequests: requests.length,
    traceRequests: countGroup(traces),
    logRequests: countGroup(logs),
    replayRequests: countGroup(replays),
  };
}

export function getPostBody(entry: HarEntry): string | null {
  return entry.request.postData?.text ?? null;
}

export function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
