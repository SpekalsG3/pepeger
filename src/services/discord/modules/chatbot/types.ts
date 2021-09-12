import { AxiosInstance } from 'axios'

export type IChatBotConfig = Readonly<{
  categoryName: string
  generalName: string
  botToBotName: string
  rooms: {
    [guildId: string]: {
      [channelId: string]: {
        answering: boolean
        uids: {
          [userId: string]: string
        }
      }
    }
  }
  xusuApi: AxiosInstance
  xusuBotName: string
  idByTemplateFactory: Function
}>
