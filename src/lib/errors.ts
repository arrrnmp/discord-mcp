import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SeyfertError } from 'seyfert/lib/common/it/error.js';

export type ToolErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED_GUILD'
  | 'CONFIRMATION_REQUIRED'
  | 'DRY_RUN_BLOCKED'
  | 'DISCORD_API_ERROR'
  | 'INTERNAL_ERROR';

export class ToolError extends Error {
  public readonly code: ToolErrorCode;
  public readonly status: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    code: ToolErrorCode,
    message: string,
    options?: { status?: number; details?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'ToolError';
    this.code = code;
    this.status = options?.status ?? 500;
    this.details = options?.details;
  }
}

export function toolErrorResult(error: unknown): CallToolResult {
  const normalized = normalizeError(error);

  const errorPayload: Record<string, unknown> = {
    code: normalized.code,
    message: normalized.message,
    status: normalized.status,
  };

  if (normalized.details !== undefined) {
    errorPayload.details = normalized.details;
  }

  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `${normalized.code}: ${normalized.message}`,
      },
    ],
    structuredContent: {
      ok: false,
      error: errorPayload,
    },
  };
}

export function normalizeError(error: unknown): ToolError {
  if (error instanceof ToolError) {
    return error;
  }

  if (error instanceof SeyfertError) {
    return new ToolError('DISCORD_API_ERROR', error.message, {
      status: 400,
      details: {
        seyfertCode: error.code,
        metadata: error.metadata,
      },
      cause: error,
    });
  }

  if (error instanceof Error) {
    return new ToolError('INTERNAL_ERROR', error.message, {
      status: 500,
      cause: error,
    });
  }

  return new ToolError('INTERNAL_ERROR', 'Unknown error', {
    status: 500,
    details: {
      value: error,
    },
  });
}
