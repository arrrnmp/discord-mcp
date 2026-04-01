import { describe, expect, test } from 'bun:test';

import { listGuildVoiceRegionsInputSchema, listVoiceRegionsInputSchema } from './guild.js';
import {
  bulkBanMembersInputSchema,
  fetchGuildBanInputSchema,
  setCurrentMemberVoiceStateInputSchema,
  setMemberVoiceStateInputSchema,
} from './member.js';
import {
  createScheduledEventInputSchema,
  listScheduledEventUsersInputSchema,
  updateScheduledEventInputSchema,
} from './scheduled-event.js';
import {
  deleteWebhookMessageByTokenInputSchema,
  editWebhookMessageByTokenInputSchema,
  executeWebhookByTokenInputSchema,
  fetchWebhookMessageByTokenInputSchema,
} from './webhook.js';

describe('parity wave2 schemas', () => {
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

  test('validates scheduled event schemas', () => {
    expect(() =>
      createScheduledEventInputSchema.parse({
        guildId: '123456789012345678',
        name: 'Stage AMA',
        privacyLevel: 2,
        scheduledStartTime: '2026-01-01T12:00:00.000Z',
        channelId: '123456789012345679',
        entityType: 1,
      }),
    ).not.toThrow();

    expect(() =>
      createScheduledEventInputSchema.parse({
        guildId: '123456789012345678',
        name: 'External meetup',
        privacyLevel: 2,
        scheduledStartTime: '2026-01-01T12:00:00.000Z',
        scheduledEndTime: '2026-01-01T14:00:00.000Z',
        entityType: 3,
        entityMetadata: { location: 'City Hall' },
      }),
    ).not.toThrow();

    expect(() =>
      createScheduledEventInputSchema.parse({
        guildId: '123456789012345678',
        name: 'Invalid external',
        privacyLevel: 2,
        scheduledStartTime: '2026-01-01T12:00:00.000Z',
        entityType: 3,
      }),
    ).toThrow();

    expect(() =>
      updateScheduledEventInputSchema.parse({
        guildId: '123456789012345678',
        eventId: '123456789012345679',
      }),
    ).toThrow();

    expect(() =>
      listScheduledEventUsersInputSchema.parse({
        guildId: '123456789012345678',
        eventId: '123456789012345679',
        withMember: true,
      }),
    ).not.toThrow();
  });

  test('validates member parity schemas', () => {
    expect(() =>
      fetchGuildBanInputSchema.parse({
        guildId: '123456789012345678',
        userId: '123456789012345679',
      }),
    ).not.toThrow();

    expect(() =>
      bulkBanMembersInputSchema.parse({
        guildId: '123456789012345678',
        userIds: ['123456789012345679', '123456789012345680'],
        confirm: true,
      }),
    ).not.toThrow();

    expect(() =>
      setCurrentMemberVoiceStateInputSchema.parse({
        guildId: '123456789012345678',
      }),
    ).toThrow();

    expect(() =>
      setCurrentMemberVoiceStateInputSchema.parse({
        guildId: '123456789012345678',
        suppress: true,
      }),
    ).not.toThrow();

    expect(() =>
      setMemberVoiceStateInputSchema.parse({
        guildId: '123456789012345678',
        memberId: '123456789012345679',
        channelId: '123456789012345680',
      }),
    ).not.toThrow();
  });

  test('validates voice region schemas', () => {
    expect(() =>
      listGuildVoiceRegionsInputSchema.parse({
        guildId: '123456789012345678',
      }),
    ).not.toThrow();

    expect(() => listVoiceRegionsInputSchema.parse({})).not.toThrow();
  });
});
