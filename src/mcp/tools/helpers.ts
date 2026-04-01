import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { normalizeError, toolErrorResult } from '../../lib/errors.js';

type StructuredSuccess<T extends Record<string, unknown>> = {
  ok: true;
  data: T;
};

export function success<T extends Record<string, unknown>>(data: T): CallToolResult {
  const payload: StructuredSuccess<T> = {
    ok: true,
    data,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

export function failure(error: unknown): CallToolResult {
  return toolErrorResult(error);
}

export async function withToolResult<T extends Record<string, unknown>>(
  callback: () => Promise<T>,
): Promise<CallToolResult> {
  try {
    const data = await callback();
    return success(data);
  } catch (error) {
    return failure(normalizeError(error));
  }
}
