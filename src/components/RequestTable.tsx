import { useMemo, useState, useCallback } from 'react';
import type { CategorizedRequest, RequestCategory, TagColor, ContentTag, OtlpTracePayload } from '../types/har';
import { extractSpansFromPayload } from '../utils/analyzeTraces';
import { buildTraceTree } from '../utils/buildTraceTree';
import TraceTree from './TraceTree';

interface Props {
  requests: CategorizedRequest[];
}

const CATEGORY_COLORS: Record<RequestCategory, string> = {
  trace: 'bg-indigo-100 text-indigo-700',
  log: 'bg-sky-100 text-sky-700',
  replay: 'bg-violet-100 text-violet-700',
  other: 'bg-slate-100 text-slate-600',
};

const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-50 text-slate-600 ring-slate-200',
};

function TagBadge({ tag }: { tag: ContentTag }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-px text-[10px] font-medium ring-1 ring-inset ${TAG_COLOR_CLASSES[tag.color]}`}
      title={tag.tooltip}
    >
      {tag.label}
    </span>
  );
}

const FILTERS: { label: string; value: RequestCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Traces', value: 'trace' },
  { label: 'Logs', value: 'log' },
  { label: 'Replay', value: 'replay' },
  { label: 'Other', value: 'other' },
];

function hasBody(req: CategorizedRequest): boolean {
  return !!(req.entry.request.postData?.text);
}

type SortKey = 'url' | 'status' | 'size' | 'time' | 'category';
type SortDir = 'asc' | 'desc';

function truncateUrl(url: string, max = 80): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > max ? path.slice(0, max) + '...' : path;
  } catch {
    return url.length > max ? url.slice(0, max) + '...' : url;
  }
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${copied
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
        }`}
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function PayloadPanel({ req }: { req: CategorizedRequest }) {
  const [tab, setTab] = useState<'request' | 'response' | 'headers' | 'trace_tree'>('request');
  const requestBody = req.entry.request.postData?.text ?? null;
  const responseBody = req.entry.response.content.text ?? null;

  const tabs = [
    { id: 'request' as const, label: 'Request Body', available: !!requestBody },
    { id: 'response' as const, label: 'Response Body', available: !!responseBody },
    { id: 'headers' as const, label: 'Headers', available: true },
    { id: 'trace_tree' as const, label: 'Trace Tree', available: req.category === 'trace' && !!requestBody },
  ];

  const headersText = useMemo(() => {
    const reqH = req.entry.request.headers.map((h) => `${h.name}: ${h.value}`).join('\n');
    const resH = req.entry.response.headers.map((h) => `${h.name}: ${h.value}`).join('\n');
    return `--- Request Headers ---\n${reqH}\n\n--- Response Headers ---\n${resH}`;
  }, [req]);

  const currentCopyText = useMemo(() => {
    if (tab === 'request') return requestBody ? prettyJson(requestBody) : '';
    if (tab === 'response') return responseBody ? prettyJson(responseBody) : '';
    if (tab === 'trace_tree') return '';
    return headersText;
  }, [tab, requestBody, responseBody, headersText]);

  const traceTreeNodes = useMemo(() => {
    if (tab !== 'trace_tree' || !requestBody) return [];
    try {
      const payload = JSON.parse(requestBody) as OtlpTracePayload;
      const spans = extractSpansFromPayload(payload);
      return buildTraceTree(spans);
    } catch {
      return [];
    }
  }, [tab, requestBody]);

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
      <div className="mb-2 flex items-center gap-3">
        <p className="break-all font-mono text-xs text-slate-500">{req.url}</p>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              disabled={!t.available}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${tab === t.id
                  ? 'bg-indigo-600 text-white'
                  : t.available
                    ? 'bg-white text-slate-600 hover:bg-slate-100'
                    : 'bg-white text-slate-300 cursor-not-allowed'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {currentCopyText && <CopyButton text={currentCopyText} />}
      </div>

      {tab === 'request' && (
        <div className="max-h-96 overflow-auto rounded-lg bg-white border border-slate-200 p-3">
          {requestBody ? (
            <pre className="whitespace-pre-wrap break-all text-xs text-slate-700 font-mono">
              {prettyJson(requestBody)}
            </pre>
          ) : (
            <p className="text-xs text-slate-400">No request body</p>
          )}
        </div>
      )}

      {tab === 'response' && (
        <div className="max-h-96 overflow-auto rounded-lg bg-white border border-slate-200 p-3">
          {responseBody ? (
            <pre className="whitespace-pre-wrap break-all text-xs text-slate-700 font-mono">
              {prettyJson(responseBody)}
            </pre>
          ) : (
            <p className="text-xs text-slate-400">No response body</p>
          )}
        </div>
      )}

      {tab === 'headers' && (
        <div className="max-h-96 overflow-auto rounded-lg bg-white border border-slate-200">
          <div className="p-3">
            <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Request Headers
            </p>
            <table className="w-full text-xs">
              <tbody>
                {req.entry.request.headers.map((h, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-0.5 pr-3 font-semibold text-slate-600 align-top whitespace-nowrap">
                      {h.name}
                    </td>
                    <td className="py-0.5 text-slate-500 break-all font-mono">
                      {h.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 p-3">
            <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Response Headers
            </p>
            <table className="w-full text-xs">
              <tbody>
                {req.entry.response.headers.map((h, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-0.5 pr-3 font-semibold text-slate-600 align-top whitespace-nowrap">
                      {h.name}
                    </td>
                    <td className="py-0.5 text-slate-500 break-all font-mono">
                      {h.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'trace_tree' && (
        <div className="max-h-96 overflow-auto rounded-lg bg-white border border-slate-200 p-3">
          {traceTreeNodes.length > 0 ? (
            <TraceTree nodes={traceTreeNodes} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
               <p className="text-xs italic">Unable to build trace tree. The payload might be malformed or empty.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestTable({ requests }: Props) {
  const [filter, setFilter] = useState<RequestCategory | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hideOptions, setHideOptions] = useState(true);

  const allTagLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const r of requests) {
      for (const t of r.contentTags) labels.add(t.label);
    }
    return [...labels].sort();
  }, [requests]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleExpand = useCallback((idx: number) => {
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const filtered = useMemo(() => {
    let items = filter === 'all' ? requests : requests.filter((r) => r.category === filter);
    if (hideOptions) {
      items = items.filter((r) => r.method !== 'OPTIONS');
    }
    if (tagFilter) {
      items = items.filter((r) => r.contentTags.some((t) => t.label === tagFilter));
    }
    items = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'url':
          cmp = a.url.localeCompare(b.url);
          break;
        case 'status':
          cmp = a.status - b.status;
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'time':
          cmp = a.time - b.time;
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [requests, filter, tagFilter, sortKey, sortDir, hideOptions]);

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="cursor-pointer px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 select-none"
      onClick={() => toggleSort(col)}
    >
      {label}
      {sortKey === col && (
        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-800">
          Request Timeline
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({filtered.length})
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === f.value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {allTagLabels.length > 0 && (
            <select
              value={tagFilter ?? ''}
              onChange={(e) => setTagFilter(e.target.value || null)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">All Tags</option>
              {allTagLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={hideOptions}
              onChange={(e) => setHideOptions(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-600"
            />
            Hide OPTIONS
          </label>
        </div>
      </div>

      <div className="max-h-[700px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr>
              <th className="w-8 px-2 py-2" />
              <SortHeader label="URL" col="url" />
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Method
              </th>
              <SortHeader label="Status" col="status" />
              <SortHeader label="Size" col="size" />
              <SortHeader label="Time" col="time" />
              <SortHeader label="Type" col="category" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((req, i) => {
              const isExpanded = expandedIdx === i;
              return (
                <tr key={i} className="group">
                  <td colSpan={7} className="p-0">
                    <div
                      className={`flex cursor-pointer items-center hover:bg-slate-50 ${isExpanded ? 'bg-indigo-50' : ''}`}
                      onClick={() => toggleExpand(i)}
                    >
                      <div className="w-8 flex-shrink-0 px-2 py-2 text-center">
                        <svg
                          className={`mx-auto h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                      <div
                        className="flex-1 min-w-0 px-4 py-2"
                        title={req.url}
                      >
                        <div className="flex items-center gap-2">
                          <div className="truncate font-mono text-xs text-slate-700">
                            {truncateUrl(req.url)}
                          </div>
                          {req.category === 'trace' && hasBody(req) && (
                            <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200 animate-pulse">
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              TRACE TREE AVAILABLE
                            </span>
                          )}
                        </div>
                        {req.contentTags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {req.contentTags.map((tag, ti) => (
                              <TagBadge key={ti} tag={tag} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-24 flex-shrink-0 px-4 py-2 text-xs text-slate-500 flex items-center gap-1.5">
                        <span className={req.method === 'POST' ? 'font-semibold text-slate-700' : ''}>
                          {req.method}
                        </span>
                        {hasBody(req) && (
                          <span className="rounded bg-emerald-100 px-1 py-px text-[10px] font-semibold text-emerald-700">
                            BODY
                          </span>
                        )}
                      </div>
                      <div className="w-16 flex-shrink-0 px-4 py-2">
                        <span
                          className={`text-xs font-semibold ${req.status >= 200 && req.status < 300
                              ? 'text-emerald-600'
                              : req.status >= 400
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="w-20 flex-shrink-0 px-4 py-2 text-xs text-slate-500">
                        {formatSize(req.size)}
                      </div>
                      <div className="w-20 flex-shrink-0 px-4 py-2 text-xs text-slate-500">
                        {req.time.toFixed(0)} ms
                      </div>
                      <div className="w-20 flex-shrink-0 px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[req.category]}`}
                        >
                          {req.category}
                        </span>
                      </div>
                    </div>
                    {isExpanded && <PayloadPanel req={req} />}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No matching requests
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
