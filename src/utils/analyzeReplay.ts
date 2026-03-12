import type { CategorizedRequest, SessionReplayAnalysis } from '../types/har';

export function analyzeSessionReplay(
  requests: CategorizedRequest[]
): SessionReplayAnalysis {
  const replayRequests = requests.filter((r) => r.category === 'replay');

  const hasSessionDataParam = replayRequests.some((r) =>
    r.url.includes('sessionData=')
  );

  let totalPayloadBytes = 0;
  for (const req of replayRequests) {
    const bodyText = req.entry.request.postData?.text;
    if (bodyText) {
      totalPayloadBytes += new Blob([bodyText]).size;
    }
  }

  return {
    totalRequests: replayRequests.length,
    successRequests: replayRequests.filter(
      (r) => r.status >= 200 && r.status < 300
    ).length,
    failedRequests: replayRequests.filter(
      (r) => r.status < 200 || r.status >= 300
    ).length,
    totalPayloadBytes,
    hasSessionDataParam,
  };
}
