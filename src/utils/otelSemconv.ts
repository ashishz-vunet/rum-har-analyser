import * as stableSemconv from '@opentelemetry/semantic-conventions';
import * as incubatingSemconv from '@opentelemetry/semantic-conventions/incubating';

const ATTRIBUTE_CONSTANT_PREFIX = 'ATTR_';

function extractAttributeKeys(moduleExports: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  for (const [name, value] of Object.entries(moduleExports)) {
    if (name.startsWith(ATTRIBUTE_CONSTANT_PREFIX) && typeof value === 'string') {
      keys.add(value);
    }
  }
  return keys;
}

export const OTEL_SEMCONV_ATTRIBUTE_KEYS = new Set<string>([
  ...extractAttributeKeys(stableSemconv),
  ...extractAttributeKeys(incubatingSemconv),
]);
