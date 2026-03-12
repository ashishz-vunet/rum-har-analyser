import { useState } from 'react';
import type { FullAnalysis } from './types/har';
import { parseHarFile } from './utils/parseHar';
import { analyzeHar } from './utils/analyze';
import FileDropZone from './components/FileDropZone';
import OverviewCards from './components/OverviewCards';
import DocumentLoadPanel from './components/DocumentLoadPanel';
import SpanErrorsPanel from './components/SpanErrorsPanel';
import ExportHealthPanel from './components/ExportHealthPanel';
import SessionReplayPanel from './components/SessionReplayPanel';
import OtelAttributesPanel from './components/OtelAttributesPanel';
import RequestTable from './components/RequestTable';
import TraceExplorer from './components/TraceExplorer';

export default function App() {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFile = (text: string, name: string) => {
    try {
      setError(null);
      const har = parseHarFile(text);
      if (!har?.log?.entries) {
        setError('Invalid HAR file: missing log.entries');
        return;
      }
      setFileName(name);
      setAnalysis(analyzeHar(har));
    } catch (e) {
      setError(`Failed to parse HAR file: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setFileName('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/vunet-logo.jpg"
              alt="Vunet Systems logo"
              className="h-9 w-9 rounded-full border border-slate-200 object-cover"
            />
            <div>
              <h1 className="text-base font-bold text-slate-800">
                Vunet RUM HAR Analyzer
              </h1>
              <p className="text-[11px] text-slate-500">
                OpenTelemetry trace and log diagnostics
              </p>
            </div>
          </div>
          {analysis && (
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Analyze another file
            </button>
          )}
          {!analysis && (
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
              Local analysis only
            </span>
          )}
        </div>
      </header>

      <main
        className={`mx-auto px-6 ${
          analysis ? 'max-w-6xl py-8' : 'flex min-h-[calc(100vh-73px)] max-w-6xl flex-col py-8'
        }`}
      >
        {!analysis && (
          <>
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-3xl">
                <div className="mb-6 text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-800">
                    Upload HAR and inspect RUM telemetry
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Parse traces, logs, spans, and web vitals in one view.
                  </p>
                </div>
                <FileDropZone onFileLoaded={handleFile} />
                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 border-t border-slate-200 pt-5 text-center">
              <img
                src="/vunet-logo.jpg"
                alt="Vunet Systems logo"
                className="mx-auto mb-3 h-11 w-11 rounded-full border border-slate-200 object-cover"
              />
              <p className="text-sm font-semibold text-indigo-700">Vunet Systems</p>
              <p className="mt-1 text-xs text-slate-500">
                2026 Vunet Systems. Built &amp; Maintained by{' '}
                <a
                  href="https://ashishz.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-700"
                >
                  Ashish Zingade
                </a>
              </p>
            </div>
          </>
        )}

        {analysis && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Analysis Dashboard
                  </p>
                  <h2 className="text-lg font-bold text-slate-800">
                    HAR Deep Dive
                  </h2>
                  <p className="text-xs text-slate-500">
                    Structured view of request health, traces, spans, and telemetry quality.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  File: {fileName}
                </span>
              </div>
              <OverviewCards stats={analysis.overview} fileName={fileName} />
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Core Page Load
                </h3>
                <p className="text-xs text-slate-500">
                  documentLoad hierarchy and embedded web vitals.
                </p>
              </div>
              <DocumentLoadPanel
                data={analysis.documentLoad}
                webVitals={analysis.webVitals}
              />
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Export Reliability
                </h3>
                <p className="text-xs text-slate-500">
                  Span lifecycle problems and exporter retry health.
                </p>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                <SpanErrorsPanel data={analysis.spanErrors} />
                <ExportHealthPanel data={analysis.exportHealth} />
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Replay and Attribute Quality
                </h3>
                <p className="text-xs text-slate-500">
                  Replay transport metrics and semantic convention coverage.
                </p>
              </div>
              <div className="grid gap-6">
                <SessionReplayPanel data={analysis.sessionReplay} />
                <OtelAttributesPanel data={analysis.otelAttributes} />
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Trace and Request Drilldown
                </h3>
                <p className="text-xs text-slate-500">
                  Explore trace trees and raw request/response payload details.
                </p>
              </div>
              <TraceExplorer trees={analysis.globalTraceTrees} />
              <RequestTable requests={analysis.requests} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
