import { describe, expect, test } from 'bun:test';

import {
  modifyGuildChannelPositionsInputSchema,
  modifyGuildRolePositionsInputSchema,
} from './reorder.js';
import {
  getRoleMemberCountsInputSchema,
  getInviteTargetUsersInputSchema,
  updateInviteTargetUsersInputSchema,
  getInviteTargetUserJobStatusInputSchema,
} from './role-invite-parity.js';
import {
  createStageInstanceInputSchema,
  deleteStageInstanceInputSchema,
  fetchStageInstanceInputSchema,
  getGuildPreviewInputSchema,
  listActiveThreadsInputSchema,
  updateStageInstanceInputSchema,
} from './stage.js';

describe('wave3 schemas', () => {
  test('validates channel position reorder schema', () => {
    expect(() =>
      modifyGuildChannelPositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: [{ id: '123456789012345679', position: 0 }],
        confirm: true,
      }),
    ).not.toThrow();

    // confirm defaults to false when omitted (schema does not throw; service rejects false)
    const withoutConfirm = modifyGuildChannelPositionsInputSchema.parse({
      guildId: '123456789012345678',
      positions: [{ id: '123456789012345679', position: 0 }],
    });
    expect(withoutConfirm.confirm).toBe(false);

    // empty positions array
    expect(() =>
      modifyGuildChannelPositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: [],
        confirm: true,
      }),
    ).toThrow();

    // more than 50 entries
    expect(() =>
      modifyGuildChannelPositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: Array.from({ length: 51 }, (_, i) => ({ id: `${String(i).padStart(18, '1')}`, position: i })),
        confirm: true,
      }),
    ).toThrow();

    // nullable position is allowed
    expect(() =>
      modifyGuildChannelPositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: [{ id: '123456789012345679', position: null }],
        confirm: true,
      }),
    ).not.toThrow();
  });

  test('validates role position reorder schema', () => {
    expect(() =>
      modifyGuildRolePositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: [{ id: '123456789012345679', position: 1 }],
        confirm: true,
      }),
    ).not.toThrow();

    // confirm defaults to false when omitted (schema does not throw; service rejects false)
    const withoutConfirm = modifyGuildRolePositionsInputSchema.parse({
      guildId: '123456789012345678',
      positions: [{ id: '123456789012345679', position: 1 }],
    });
    expect(withoutConfirm.confirm).toBe(false);

    // allows up to 250 entries
    expect(() =>
      modifyGuildRolePositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: Array.from({ length: 250 }, (_, i) => ({ id: `${String(i).padStart(18, '1')}`, position: i })),
        confirm: true,
      }),
    ).not.toThrow();

    // rejects 251 entries
    expect(() =>
      modifyGuildRolePositionsInputSchema.parse({
        guildId: '123456789012345678',
        positions: Array.from({ length: 251 }, (_, i) => ({ id: `${String(i).padStart(18, '1')}`, position: i })),
        confirm: true,
      }),
    ).toThrow();
  });

  test('validates role member counts schema', () => {
    expect(() =>
      getRoleMemberCountsInputSchema.parse({
        guildId: '123456789012345678',
      }),
    ).not.toThrow();

    expect(() => getRoleMemberCountsInputSchema.parse({})).toThrow();
  });

  test('validates invite target users schemas', () => {
    expect(() =>
      getInviteTargetUsersInputSchema.parse({ inviteCode: 'abc123' }),
    ).not.toThrow();

    expect(() => getInviteTargetUsersInputSchema.parse({ inviteCode: '' })).toThrow();

    expect(() =>
      updateInviteTargetUsersInputSchema.parse({
        inviteCode: 'abc123',
        targetUserIds: ['123456789012345678', '123456789012345679'],
      }),
    ).not.toThrow();

    // empty targetUserIds
    expect(() =>
      updateInviteTargetUsersInputSchema.parse({
        inviteCode: 'abc123',
        targetUserIds: [],
      }),
    ).toThrow();

    expect(() =>
      getInviteTargetUserJobStatusInputSchema.parse({ inviteCode: 'abc123' }),
    ).not.toThrow();
  });

  test('validates stage instance schemas', () => {
    expect(() =>
      createStageInstanceInputSchema.parse({
        guildId: '123456789012345678',
        channelId: '123456789012345679',
        topic: 'AMA with the team',
      }),
    ).not.toThrow();

    // topic too long
    expect(() =>
      createStageInstanceInputSchema.parse({
        guildId: '123456789012345678',
        channelId: '123456789012345679',
        topic: 'A'.repeat(121),
      }),
    ).toThrow();

    // empty topic
    expect(() =>
      createStageInstanceInputSchema.parse({
        guildId: '123456789012345678',
        channelId: '123456789012345679',
        topic: '',
      }),
    ).toThrow();

    expect(() =>
      fetchStageInstanceInputSchema.parse({ channelId: '123456789012345679' }),
    ).not.toThrow();

    // update requires at least one field (validated at service level, schema allows all optional)
    expect(() =>
      updateStageInstanceInputSchema.parse({ channelId: '123456789012345679' }),
    ).not.toThrow();

    expect(() =>
      updateStageInstanceInputSchema.parse({
        channelId: '123456789012345679',
        topic: 'New topic',
      }),
    ).not.toThrow();

    // delete parses successfully; confirm defaults to false (service enforces confirm=true)
    expect(() =>
      deleteStageInstanceInputSchema.parse({
        channelId: '123456789012345679',
        confirm: true,
      }),
    ).not.toThrow();

    const withoutConfirm = deleteStageInstanceInputSchema.parse({ channelId: '123456789012345679' });
    expect(withoutConfirm.confirm).toBe(false);
  });

  test('validates guild preview and active threads schemas', () => {
    expect(() =>
      getGuildPreviewInputSchema.parse({ guildId: '123456789012345678' }),
    ).not.toThrow();

    expect(() => getGuildPreviewInputSchema.parse({})).toThrow();

    expect(() =>
      listActiveThreadsInputSchema.parse({ guildId: '123456789012345678' }),
    ).not.toThrow();

    expect(() => listActiveThreadsInputSchema.parse({})).toThrow();
  });
});
