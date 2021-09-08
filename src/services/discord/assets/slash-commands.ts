export enum ECommands {
  status = 'status',
  ban = 'ban'
}

export interface ISlashCommand {
  name: ECommands
  description: string
}

export const SlashCommands: ISlashCommand[] = [{
  name: ECommands.status,
  description: 'Проверить дышит ли',
}]
