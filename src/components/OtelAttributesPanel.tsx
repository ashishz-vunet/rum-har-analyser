import { useMemo, useState } from 'react';
import type { OtelAttributeAnalysis } from '../types/har';

interface Props {
  data: OtelAttributeAnalysis;
}

type Filter = 'all' | 'standard' | 'nonStandard';
type KeyFormat = 'raw' | 'qualified';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'standard', label: 'Standard' },
  { value: 'nonStandard', label: 'Non-standard' },
];

export default function OtelAttributesPanel({ data }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('raw');

  const activeRows = keyFormat === 'qualified' ? data.qualifiedRows : data.rows;
  const activeSummary =
    keyFormat === 'qualified' ? data.qualifiedSummary : data.summary;

  const filteredRows = useMemo(() => {
    if (filter === 'all') return activeRows;
    if (filter === 'standard') return activeRows.filter((row) => row.isStandard);
    return activeRows.filter((row) => !row.isStandard);
  }, [activeRows, filter]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">OTel Attribute Coverage</h2>
          <p className="text-xs text-slate-500">
            Distinct attributes extracted from SDK payloads and validated against OTel semconv.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
            <button
              onClick={() => setKeyFormat('raw')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                keyFormat === 'raw'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Raw Keys
            </button>
            <button
              onClick={() => setKeyFormat('qualified')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                keyFormat === 'qualified'
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Qualified Keys
            </button>
          </div>
          <div className="flex gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === item.value
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          Distinct: {activeSummary.totalDistinct}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          Occurrences: {activeSummary.totalOccurrences}
        </span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
          Standard: {activeSummary.standardCount}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
          Non-standard: {activeSummary.nonStandardCount}
        </span>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Attribute Key
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Occurrences
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Standard
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Suggested Standard
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{row.key}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-slate-700">
                  {row.count}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.isStandard
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {row.isStandard ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {row.isStandard
                    ? '--'
                    : row.suggestedStandardKey ?? 'No direct standard mapping'}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  No attributes found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
