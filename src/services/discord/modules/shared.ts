import { Client, Guild, Message } from 'discord.js'

import { Logger } from '../../../libs/logger'
import { IDiscordConfig } from '../types'
import { Listeners } from '../../../utils/listeners'
import { EEmotes } from '../assets/emotes'

type TAnyVoid = void | Promise<void>

interface IEvents {
  initGuild: (guild: Guild) => TAnyVoid
  deleteGuild: (guild: Guild) => TAnyVoid
  onMessage: (message: Message) => Promise<boolean>
}

export class Shared {
  protected readonly foundEmotes = new Map<string, { [emojiName: string]: string }>()
  protected readonly client = new Client()
  protected readonly logger = new Logger('DISCORD-CLIENT')
  protected readonly config: IDiscordConfig
  protected readonly listeners: Listeners<IEvents>

  private async getGuildEmojies (guild: Guild): Promise<void> {
    const emojiNames = Object.values(EEmotes)
    const guildEmojies = {}

    for (const [, emoji] of guild.emojis.cache) {
      if (emojiNames.includes(<EEmotes>emoji.name)) {
        guildEmojies[emoji.name] = emoji.id
      }
    }
    this.foundEmotes.set(guild.id, guildEmojies)
  }

  constructor (config: IDiscordConfig) {
    this.listeners = new Listeners()
    this.config = config

    this.listeners.add('initGuild', async (guild: Guild) => {
      await this.getGuildEmojies(guild)
    })
    this.listeners.add('deleteGuild', (guild: Guild) => {
      this.foundEmotes.delete(guild.id)
    })
  }
}
