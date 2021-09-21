import { Client, Guild, Message } from 'discord.js'

import { Logger } from '../../libs/logger'

import { Listeners } from '../../utils/listeners'

import { IContext, IDiscordConfig } from './types'
import { EEmotes } from './assets/emotes'
import { ChatBotModule } from './modules/chatbot'
import { CommandsModule } from './modules/commands'

type TModule = new (ctx: IContext) => any

export class Discord {
  private readonly ctx: IContext
  // private readonly modules: TModule[] = []

  constructor (config: IDiscordConfig) {
    this.ctx = {
      foundEmotes: new Map(),
      client: new Client(),
      logger: new Logger('DISCORD-CLIENT'),
      listeners: new Listeners(),
      config: config,
    }

    this.ctx.listeners.add('initGuild', async (guild: Guild) => {
      const emojiNames = Object.values(EEmotes)
      const guildEmojies = {}

      for (const [, emoji] of guild.emojis.cache) {
        if (emojiNames.includes(<EEmotes>emoji.name)) {
          guildEmojies[emoji.name] = emoji.id
        }
      }
      this.ctx.foundEmotes.set(guild.id, guildEmojies)
    })
    this.ctx.listeners.add('deleteGuild', (guild: Guild) => {
      this.ctx.foundEmotes.delete(guild.id)
    })

    this.applyModules([ChatBotModule, CommandsModule])
    this.initListeners()
  }

  public applyModules (modules: TModule[]): void {
    for (const Module of modules) {
      // eslint-disable-next-line no-new
      new Module(this.ctx)
    }
  }

  private initForGuild (guild: Guild): void {
    for (const guildInitListener of this.ctx.listeners.get('initGuild')) {
      void (async () => {
        try {
          await guildInitListener(guild)
        } catch (e) {
          this.ctx.logger.error(`Failed to handle 'initForGuild' for guild '${guild.name}' (${guild.id}): ${e.error}`)
        }
      })()
    }
  }

  private initListeners (): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.ctx.client.on('ready', async (): Promise<void> => {
      this.ctx.logger.info(`Logged in as: ${this.ctx.client.user.tag}`)

      const emojiNames = Object.values(EEmotes)
      const emojis = this.ctx.client.emojis.cache
      for (const [emojiId, emoji] of emojis) {
        let guildEmojies = this.ctx.foundEmotes.get(emoji.guild.id)
        if (!guildEmojies) {
          guildEmojies = {}
        }
        if (emojiNames.includes(<EEmotes>emoji.name)) {
          Object.assign(guildEmojies, { [emoji.name]: emojiId })
        }
        this.ctx.foundEmotes.set(emoji.guild.id, guildEmojies)
      }

      for (const [, guild] of this.ctx.client.guilds.cache) {
        await this.initForGuild(guild)
      }
    })

    this.ctx.client.on('error', (error: Error): void => {
      this.ctx.logger.error(`Discord.js threw error: ${error.message}`)
    })

    this.ctx.client.on('guildCreate', (guild: Guild) => {
      this.ctx.logger.info(`Added on new server '${guild.name}' (${guild.id}), owner ${guild.owner.user.tag}`)
      void this.initForGuild(guild)
    })

    this.ctx.client.on('guildDelete', (guild: Guild) => {
      for (const listener of this.ctx.listeners.get('deleteGuild')) {
        void (async () => {
          try {
            await listener(guild)
          } catch (e) {
            this.ctx.logger.error(`Failed to handle 'deleteGuild' for guild '${guild.name}' (${guild.id}): ${e.message}`)
          }
        })()
      }
    })

    this.ctx.client.on('message', (message: Message): void => {
      if (message.author.bot) return

      for (const listener of this.ctx.listeners.get('onMessage')) {
        void (async () => {
          try {
            await listener(message)
          } catch (e) {
            this.ctx.logger.error(`Failed to handle 'onMessage' on guild ${message.guild.id} (${message.guild.id}) from user ${message.author.tag} (${message.author.id}): ${e.message}`)
          }
        })()
      }
    })
  }

  public async login (): Promise<void> {
    await this.ctx.client.login(this.ctx.config.token)
  }
}
