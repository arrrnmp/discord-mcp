import { describe, expect, test } from 'bun:test';

import {
  deleteWebhookMessageByTokenInputSchema,
  editWebhookMessageByTokenInputSchema,
  executeWebhookByTokenInputSchema,
  fetchWebhookMessageByTokenInputSchema,
} from './webhook.js';

describe('webhook schemas', () => {
  test('validates webhook token operations', () => {
    expect(() =>
      executeWebhookByTokenInputSchema.parse({
        guildId: '123456789012345678',
        webhookId: '123456789012345679',
        token: 'abc',
        content: 'hello',
      }),
    ).not.toThrow();

    expect(() =>
      executeWebhookByTokenInputSchema.parse({
        guildId: '123456789012345678',
        webhookId: '123456789012345679',
        token: 'abc',
      }),
    ).toThrow();

    expect(() =>
      fetchWebhookMessageByTokenInputSchema.parse({
        guildId: '123456789012345678',
        webhookId: '123456789012345679',
        token: 'abc',
        messageId: '123456789012345680',
      }),
    ).not.toThrow();

    expect(() =>
      editWebhookMessageByTokenInputSchema.parse({
        guildId: '123456789012345678',
        webhookId: '123456789012345679',
        token: 'abc',
        messageId: '123456789012345680',
        content: 'updated',
      }),
    ).not.toThrow();

    expect(() =>
      deleteWebhookMessageByTokenInputSchema.parse({
        guildId: '123456789012345678',
        webhookId: '123456789012345679',
        token: 'abc',
        messageId: '123456789012345680',
        confirm: true,
      }),
    ).not.toThrow();
  });
});
