import type { HarFile, FullAnalysis } from '../types/har';
import { categorizeRequests, computeOverview } from './parseHar';
import { analyzeDocumentLoad, analyzeWebVitals } from './analyzeTraces';
import { analyzeSpanErrors, analyzeExportHealth } from './analyzeLogs';
import { analyzeSessionReplay } from './analyzeReplay';
import { analyzeOtelAttributes } from './analyzeOtelAttributes';
import { getPostBody, safeParseJson } from './parseHar';
import { extractSpansFromPayload } from './analyzeTraces';
import { buildTraceTree } from './buildTraceTree';
import type { OtlpTracePayload } from '../types/har';

export function analyzeHar(har: HarFile): FullAnalysis {
  const requests = categorizeRequests(har.log.entries);
  const allSpans = requests
    .filter((r) => r.category === 'trace')
    .flatMap((r) => {
      const body = getPostBody(r.entry);
      if (!body) return [];
      const payload = safeParseJson<OtlpTracePayload>(body);
      return payload ? extractSpansFromPayload(payload) : [];
    });

  return {
    overview: computeOverview(requests),
    documentLoad: analyzeDocumentLoad(requests),
    webVitals: analyzeWebVitals(requests),
    spanErrors: analyzeSpanErrors(requests),
    exportHealth: analyzeExportHealth(requests),
    sessionReplay: analyzeSessionReplay(requests),
    otelAttributes: analyzeOtelAttributes(requests),
    requests,
    globalTraceTrees: buildTraceTree(allSpans),
  };
}
