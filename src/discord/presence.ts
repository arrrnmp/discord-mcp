import type { Client } from 'seyfert';
import type { PresenceUpdateStatus } from 'seyfert/lib/types/index.js';
import { type HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

type DiscordPresenceStatus = 'online' | 'dnd' | 'idle' | 'invisible' | 'offline';

export type DiscordPresenceState = {
  gatewayEnabled: boolean;
  shardCount: number;
  readyShardCount: number;
  status?: DiscordPresenceStatus;
  activities: Array<{
    name: string;
    type: number;
    state?: string;
    url?: string;
  }>;
  afk: boolean;
};

export type SetPresenceOptions = {
  status: DiscordPresenceStatus;
  activityName?: string;
  activityType?: number;
  activityState?: string;
  activityUrl?: string;
  afk?: boolean;
  confirm?: boolean;
};

export class DiscordPresenceService extends DiscordBaseService {
  private lastPresence: DiscordPresenceState = {
    gatewayEnabled: false,
    shardCount: 0,
    readyShardCount: 0,
    status: 'online',
    activities: [],
    afk: false,
  };

  constructor(
    private readonly gatewayClient: Client | undefined,
    config: AppConfig,
  ) {
    super({} as HttpClient, config); // Pass dummy client since presence uses gatewayClient
    this.lastPresence.gatewayEnabled = this.gatewayClient !== undefined;
  }

  getPresenceState(): DiscordPresenceState {
    const shardStats = this.getShardStats();
    return {
      ...this.lastPresence,
      gatewayEnabled: this.gatewayClient !== undefined,
      shardCount: shardStats.shardCount,
      readyShardCount: shardStats.readyShardCount,
    };
  }

  setPresence(options: SetPresenceOptions): DiscordPresenceState {
    this.assertGatewayEnabled('presence.set');
    this.assertConfirm(options.confirm, 'presence.set', {});

    const shardManager = this.gatewayClient!.gateway;
    const activities = this.buildActivities(options);

    this.auditMutation(
      this.buildMutationContext('gateway', 'presence.set', {
        status: options.status as any,
        confirm: options.confirm,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('presence.set', {
        status: options.status,
        activityName: options.activityName,
        activityType: options.activityType,
      });
    }

    shardManager.setPresence({
      since: null,
      afk: options.afk ?? false,
      status: options.status as unknown as PresenceUpdateStatus,
      activities,
    });

    this.lastPresence = {
      gatewayEnabled: true,
      shardCount: shardManager.size,
      readyShardCount: this.getReadyShardCount(),
      status: options.status,
      activities: activities.map((activity) => {
        const payload: { name: string; type: number; state?: string; url?: string } = {
          name: activity.name,
          type: activity.type,
        };
        if (activity.state !== undefined) {
          payload.state = activity.state;
        }
        if (activity.url !== undefined) {
          payload.url = activity.url;
        }
        return payload;
      }),
      afk: options.afk ?? false,
    };

    return this.lastPresence;
  }

  private buildActivities(options: SetPresenceOptions): Array<{ name: string; type: number; state?: string; url?: string }> {
    if (!options.activityName) {
      return [];
    }

    const activityType = options.activityType ?? 0;
    if (activityType < 0 || activityType > 5) {
      throw new ToolError('BAD_REQUEST', 'activityType must be between 0 and 5', {
        status: 400,
        details: {
          activityType,
        },
      });
    }

    if (options.activityUrl !== undefined && activityType !== 1) {
      throw new ToolError('BAD_REQUEST', 'activityUrl is only valid when activityType is 1 (Streaming)', {
        status: 400,
        details: {
          activityType,
          activityUrl: options.activityUrl,
        },
      });
    }

    const activity: { name: string; type: number; state?: string; url?: string } = {
      name: options.activityName,
      type: activityType,
    };

    if (options.activityState !== undefined) {
      activity.state = options.activityState;
    }

    if (options.activityUrl !== undefined) {
      activity.url = options.activityUrl;
    }

    return [activity];
  }

  private assertGatewayEnabled(action: string): void {
    if (this.gatewayClient?.gateway) {
      return;
    }

    throw new ToolError(
      'BAD_REQUEST',
      `Action ${action} requires gateway mode. Set DISCORD_GATEWAY_ENABLED=true and restart.`,
      {
        status: 400,
        details: {
          gatewayEnabled: false,
        },
      },
    );
  }

  private getShardStats(): { shardCount: number; readyShardCount: number } {
    if (!this.gatewayClient?.gateway) {
      return {
        shardCount: 0,
        readyShardCount: 0,
      };
    }

    return {
      shardCount: this.gatewayClient.gateway.size,
      readyShardCount: this.getReadyShardCount(),
    };
  }

  private getReadyShardCount(): number {
    if (!this.gatewayClient?.gateway) {
      return 0;
    }

    let readyCount = 0;
    for (const shard of this.gatewayClient.gateway.values()) {
      if (shard.isReady) {
        readyCount += 1;
      }
    }
    return readyCount;
  }
}
