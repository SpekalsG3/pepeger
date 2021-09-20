import { AxiosInstance } from 'axios'
import { FileOptions, MessageEmbed, MessageEmbedOptions } from 'discord.js'

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

export enum EQuoteTypes {
  text = 'text',
  embed = 'embed',
  attachment = 'attachment'
}

interface EQuoteTypeToType {
  [EQuoteTypes.text]: string
  [EQuoteTypes.embed]: MessageEmbed | MessageEmbedOptions
  [EQuoteTypes.attachment]: Array<Required<FileOptions>>
}

export interface IGetQuoteResponse<T extends EQuoteTypes> {
  type: T
  content: EQuoteTypeToType[T]
}
