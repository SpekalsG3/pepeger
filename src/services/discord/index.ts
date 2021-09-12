import { Guild, Message } from 'discord.js'

import { combineModules } from '../../utils/combine-modules'

import { IDiscordConfig } from './types'
import { EEmotes } from './assets/emotes'
import { ChatBotModule } from './modules/chatbot'
import { CommandsModule } from './modules/commands'

const combined = combineModules([CommandsModule, ChatBotModule])

export class Discord extends combined {
  constructor (config: IDiscordConfig) {
    super(config)
    this.initListeners()
  }

  private async initForGuild (guild: Guild): Promise<void> {
    for (const guildInitListener of this.listeners.get('initGuild')) {
      await guildInitListener(guild)
    }
  }

  private initListeners (): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.client.on('ready', async (): Promise<void> => {
      this.logger.info(`Logged in as: ${this.client.user.tag}`)

      const emojiNames = Object.values(EEmotes)
      const emojis = this.client.emojis.cache
      for (const [emojiId, emoji] of emojis) {
        let guildEmojies = this.foundEmotes.get(emoji.guild.id)
        if (!guildEmojies) {
          guildEmojies = {}
        }
        if (emojiNames.includes(<EEmotes>emoji.name)) {
          Object.assign(guildEmojies, { [emoji.name]: emojiId })
        }
        this.foundEmotes.set(emoji.guild.id, guildEmojies)
      }

      for (const [, guild] of this.client.guilds.cache) {
        await this.initForGuild(guild)
      }
    })

    this.client.on('error', (error: Error): void => {
      this.logger.error('Error: ', error.message)
    })

    this.client.on('guildCreate', (guild: Guild) => {
      this.logger.info(`Added on new server "${guild.name}", owner ${guild.owner.user.tag}`)
      void this.initForGuild(guild)
    })

    this.client.on('guildDelete', (guild: Guild) => {
      for (const listener of this.listeners.get('deleteGuild')) {
        listener(guild)
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.client.on('message', async (message: Message): Promise<void> => {
      if (message.author.bot) return

      for (const listener of this.listeners.get('onMessage')) {
        await listener(message)
      }
    })
  }

  public async login (): Promise<void> {
    await this.client.login(this.config.token)
  }
}
