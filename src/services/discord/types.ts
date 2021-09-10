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
