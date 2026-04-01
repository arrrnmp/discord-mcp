import { describe, expect, test } from 'bun:test';

import { listGuildAuditLogsInputSchema } from './audit-log.js';
import {
  beginGuildPruneInputSchema,
  updateGuildSettingsInputSchema,
  updateGuildTemplateInputSchema,
  updateGuildWelcomeScreenInputSchema,
  updateGuildWidgetSettingsInputSchema,
} from './guild-settings.js';
import { createChannelInviteInputSchema } from './special.js';

describe('guild admin and audit schemas', () => {
  test('validates guild settings update payload', () => {
    expect(() =>
      updateGuildSettingsInputSchema.parse({
        guildId: '123456789012345678',
        patch: {
          name: 'new guild name',
          preferredLocale: 'en-US',
        },
      }),
    ).not.toThrow();

    expect(() =>
      updateGuildSettingsInputSchema.parse({
        guildId: '123456789012345678',
        patch: {
          icon: 'data:image/png;base64,AAAA',
        },
      }),
    ).not.toThrow();

    expect(() =>
      updateGuildSettingsInputSchema.parse({
        guildId: '123456789012345678',
        patch: {},
      }),
    ).toThrow();
  });

  test('validates widget and welcome screen updates', () => {
    expect(() =>
      updateGuildWidgetSettingsInputSchema.parse({
        guildId: '123456789012345678',
        patch: {
          enabled: true,
        },
      }),
    ).not.toThrow();

    expect(() =>
      updateGuildWelcomeScreenInputSchema.parse({
        guildId: '123456789012345678',
        welcomeChannels: [
          {
            channelId: '123456789012345679',
            description: 'Read this first',
            emojiName: 'wave',
          },
        ],
      }),
    ).not.toThrow();
  });

  test('validates prune and template constraints', () => {
    expect(() =>
      beginGuildPruneInputSchema.parse({
        guildId: '123456789012345678',
        days: 7,
        confirm: true,
      }),
    ).not.toThrow();

    expect(() =>
      updateGuildTemplateInputSchema.parse({
        guildId: '123456789012345678',
        templateCode: 'template-code',
      }),
    ).toThrow();
  });

  test('validates invite target parity combinations', () => {
    expect(() =>
      createChannelInviteInputSchema.parse({
        channelId: '123456789012345678',
        targetType: 1,
        targetUserId: '123456789012345679',
      }),
    ).not.toThrow();

    expect(() =>
      createChannelInviteInputSchema.parse({
        channelId: '123456789012345678',
        targetType: 2,
        targetApplicationId: '123456789012345679',
      }),
    ).not.toThrow();

    expect(() =>
      createChannelInviteInputSchema.parse({
        channelId: '123456789012345678',
        targetType: 1,
        targetApplicationId: '123456789012345679',
      }),
    ).toThrow();

    expect(() =>
      createChannelInviteInputSchema.parse({
        channelId: '123456789012345678',
        targetUserId: '123456789012345679',
      }),
    ).toThrow();
  });

  test('validates audit log filter schema', () => {
    expect(() =>
      listGuildAuditLogsInputSchema.parse({
        guildId: '123456789012345678',
        actionType: 72,
        limit: 100,
      }),
    ).not.toThrow();

    expect(() =>
      listGuildAuditLogsInputSchema.parse({
        guildId: '123456789012345678',
        limit: 101,
      }),
    ).toThrow();
  });
});
