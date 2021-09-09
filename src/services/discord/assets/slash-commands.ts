export enum ECommands {
  status = 'status',
  ban = 'ban'
}

export enum EKeywords {
  sorry = 'sorry'
}

export const Keywords: { [keyword in EKeywords]: string[] } = {
  sorry: [
    'sorry', 'sory', 'сорри', 'сори', 'сорь', 'прости', 'извини', 'извени',
  ],
}

export interface ISlashCommand {
  name: ECommands
  description: string
}

export const SlashCommands: ISlashCommand[] = [{
  name: ECommands.status,
  description: 'Проверить дышит ли',
}]
