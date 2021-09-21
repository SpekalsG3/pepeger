import { Client, Guild, Message } from 'discord.js'

import { Logger } from '../../libs/logger'
import { Listeners } from '../../utils/listeners'

type TAnyVoid = void | Promise<void>

interface IEvents {
  initGuild: (guild: Guild) => TAnyVoid
  deleteGuild: (guild: Guild) => TAnyVoid
  onMessage: (message: Message) => Promise<boolean>
}

export interface IContext {
  foundEmotes: Map<string, { [emojiName: string]: string }>
  client: Client
  logger: Logger
  config: IDiscordConfig
  listeners: Listeners<IEvents>
}

export interface IDiscordConfig {
  token: string
  applicationId: string
}

export enum EDiscordStatuses {
  RUNNING = 'RUNNING'
}

export enum Permissions {
  KICK_MEMBERS = 'KICK_MEMBERS',
  BAN_MEMBERS = 'BAN_MEMBERS',
  ADMINISTRATOR = 'ADMINISTRATOR',
}

export enum ActionTypes {
  REPLY = 'REPLY',
  SET = 'SET'
}

interface ACTIONS_MAP {
  [ActionTypes.REPLY]: {
    message: string
  }
  [ActionTypes.SET]: {}
}

export type Action<T extends ActionTypes> = ACTIONS_MAP[T] & { type: T }
