export type DiscordGuildSummary = {
  id: string;
  name: string;
  features: string[];
  ownerId?: string;
  owner?: boolean;
  permissions?: string;
  memberCount?: number;
  verificationLevel?: number;
};

export type DiscordChannelSummary = {
  id: string;
  name: string;
  type: number;
  guildId?: string;
  parentId?: string | null;
  topic?: string | null;
  position?: number;
  nsfw?: boolean;
  permissionOverwrites?: DiscordChannelPermissionOverwriteSummary[];
};

export type DiscordRoleSummary = {
  id: string;
  guildId: string;
  name: string;
  color: number;
  position: number;
  hoist: boolean;
  mentionable: boolean;
  permissions: string;
};

export type DiscordChannelPermissionOverwriteSummary = {
  id: string;
  type: number;
  allow: string;
  deny: string;
};
