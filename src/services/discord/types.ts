import { EEmotes } from './assets/emotes'

export interface IDiscordConfig {
  token: string
  applicationId: string
}

export enum EDiscordStatuses {
  RUNNING = 'RUNNING'
}

export type TFoundEmotes = Map<EEmotes, { [guildId: string]: string }>
