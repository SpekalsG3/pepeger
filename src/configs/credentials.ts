import { IDiscordConfig } from '../services/discord/types'

export const DISCORD_CONFIG: IDiscordConfig = {
  token: process.env.DISCORD_TOKEN,
  applicationId: process.env.DISCORD_APPLICATION_ID,
} as const
