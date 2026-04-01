import { describe, expect, test } from 'bun:test';

import { setChannelPermissionOverwriteInputSchema } from './channel.js';
import {
  banMemberInputSchema,
  bulkBanMembersInputSchema,
  fetchGuildBanInputSchema,
  setMemberTimeoutInputSchema,
} from './member.js';
import {
  addReactionInputSchema,
  listPollAnswerVotersInputSchema,
  listReactionUsersInputSchema,
  purgeMessagesInputSchema,
  sendMessageInputSchema,
} from './message.js';
import { setPresenceInputSchema } from './presence.js';
import {
  createAutoModerationRuleInputSchema,
  createGuildEmojiInputSchema,
  createGuildSoundboardSoundInputSchema,
} from './special.js';

describe('expansion schemas', () => {
  test('validates message send and purge limits', () => {
    expect(() =>
      sendMessageInputSchema.parse({
        channelId: '123456789012345678',
        content: 'hello',
      }),
    ).not.toThrow();

    expect(() =>
      purgeMessagesInputSchema.parse({
        channelId: '123456789012345678',
        messageIds: ['123456789012345679'],
        confirm: true,
      }),
    ).toThrow();
  });

  test('validates rich message and poll payload constraints', () => {
    expect(() =>
      sendMessageInputSchema.parse({
        channelId: '123456789012345678',
        embeds: [
          {
            title: 'Status',
            description: 'Rich content',
          },
        ],
      }),
    ).not.toThrow();

    expect(() =>
      sendMessageInputSchema.parse({
        channelId: '123456789012345678',
      }),
    ).toThrow();

    expect(() =>
      sendMessageInputSchema.parse({
        channelId: '123456789012345678',
        poll: {
          question: { text: 'Pick one' },
          answers: [{ poll_media: { text: 'Only one answer' } }],
        },
      }),
    ).toThrow();
  });

  test('validates member moderation schemas', () => {
    expect(() =>
      banMemberInputSchema.parse({
        guildId: '123456789012345678',
        memberId: '123456789012345679',
        deleteMessageSeconds: 600,
        confirm: true,
      }),
    ).not.toThrow();

    const fetchedBanInput = fetchGuildBanInputSchema.parse({
      guildId: '123456789012345678',
      userId: '123456789012345679',
    });
    expect(fetchedBanInput.force).toBe(true);

    expect(() =>
      bulkBanMembersInputSchema.parse({
        guildId: '123456789012345678',
        userIds: ['123456789012345679', '123456789012345680'],
        confirm: true,
      }),
    ).not.toThrow();

    expect(() =>
      bulkBanMembersInputSchema.parse({
        guildId: '123456789012345678',
        userIds: Array.from({ length: 201 }, (_, index) => (123456789012345678n + BigInt(index)).toString()),
        confirm: true,
      }),
    ).toThrow();

    expect(() =>
      setMemberTimeoutInputSchema.parse({
        guildId: '123456789012345678',
        memberId: '123456789012345679',
        timeoutSeconds: 0,
      }),
    ).toThrow();
  });

  test('validates presence and special schemas', () => {
    expect(() =>
      setPresenceInputSchema.parse({
        status: 'online',
        confirm: true,
      }),
    ).not.toThrow();

    expect(() =>
      createGuildEmojiInputSchema.parse({
        guildId: '123456789012345678',
        name: 'party',
        image: 'data:image/png;base64,AAAA',
      }),
    ).not.toThrow();

    expect(() =>
      createAutoModerationRuleInputSchema.parse({
        guildId: '123456789012345678',
        name: 'block links',
        eventType: 1,
        triggerType: 1,
        actions: [{ type: 1 }],
      }),
    ).not.toThrow();
  });

  test('validates channel overwrite and soundboard schemas', () => {
    expect(() =>
      setChannelPermissionOverwriteInputSchema.parse({
        guildId: '123456789012345678',
        channelId: '123456789012345679',
        overwriteId: '123456789012345680',
        type: 0,
        allow: '1024',
      }),
    ).not.toThrow();

    expect(() =>
      createGuildSoundboardSoundInputSchema.parse({
        guildId: '123456789012345678',
        name: 'alert',
        sound: 'data:audio/ogg;base64,AAAA',
      }),
    ).not.toThrow();
  });

  test('validates reactions and poll voter query schemas', () => {
    expect(() =>
      addReactionInputSchema.parse({
        channelId: '123456789012345678',
        messageId: '123456789012345679',
        emoji: '🔥',
      }),
    ).not.toThrow();

    expect(() =>
      listReactionUsersInputSchema.parse({
        channelId: '123456789012345678',
        messageId: '123456789012345679',
        emoji: '🔥',
        type: 1,
      }),
    ).not.toThrow();

    expect(() =>
      listPollAnswerVotersInputSchema.parse({
        channelId: '123456789012345678',
        messageId: '123456789012345679',
        answerId: 11,
      }),
    ).toThrow();
  });
});
