import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { normalizeError, ToolError } from '../../lib/errors.js';

export function success<T extends Record<string, unknown>>(data: T): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(toJsonSafe(data), null, 2),
      },
    ],
  };
}

export function failure(error: ToolError): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error: {
              code: error.code,
              message: error.message,
              data: error.details,
            },
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
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

/**
 * Optimizes an object for JSON serialization by converting BigInts to strings.
 * Uses a shallow check first to avoid unnecessary recursion on large objects.
 */
export function toJsonSafe(obj: unknown): unknown {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Check if any element in the array is a bigint or needs processing
    let hasBigInt = false;
    for (let i = 0; i < obj.length; i++) {
      const type = typeof obj[i];
      if (type === 'bigint' || (obj[i] !== null && type === 'object')) {
        hasBigInt = true;
        break;
      }
    }

    if (!hasBigInt) return obj;
    return obj.map(toJsonSafe);
  }

  const result: Record<string, unknown> = {};
  const entries = Object.entries(obj as Record<string, unknown>);
  let changed = false;

  for (const [key, value] of entries) {
    const type = typeof value;
    if (type === 'bigint') {
      result[key] = (value as bigint).toString();
      changed = true;
    } else if (value !== null && type === 'object') {
      const processed = toJsonSafe(value);
      result[key] = processed;
      if (processed !== value) changed = true;
    } else {
      result[key] = value;
    }
  }

  return changed ? result : obj;
}
