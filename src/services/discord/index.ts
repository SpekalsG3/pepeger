import { Client, Message } from 'discord.js'

import { Logger } from '../../libs/logger'

import { EDiscordStatuses, IDiscordConfig } from './types'
import { ECommands } from './assets/slash-commands'
import { EEmotes, EmotesPriority } from './assets/emotes'

export class Discord {
  private readonly foundEmotes = new Map<string, { [emojiName: string]: string }>()
  private readonly client: Client
  private readonly logger: Logger
  private readonly config: IDiscordConfig
  private interactionTimeout = new Date()
  private timeoutExceedTimes = 0

  constructor (config: IDiscordConfig) {
    this.client = new Client()
    this.logger = new Logger('DISCORD-CLIENT')
    this.initListeners()
    this.config = config
  }

  private updateInteractionTimeout (date: Date): void {
    this.interactionTimeout = new Date(date.getTime() + 1000 * 5)
  }

  private getReplyForStatus (guildId: string, message: Message): string {
    if (this.interactionTimeout.getTime() > Date.now()) {
      if (this.timeoutExceedTimes === 1) {
        this.timeoutExceedTimes += 1
        this.updateInteractionTimeout(this.interactionTimeout)
        return 'По медленней, еще раз и иди нахуй :/'
      } else if (this.timeoutExceedTimes === 2) {
        this.timeoutExceedTimes += 1
        this.updateInteractionTimeout(this.interactionTimeout)
        return 'Лан, пошли нахуй'
      }
      return null
    }

    this.timeoutExceedTimes = 1
    this.updateInteractionTimeout(new Date())

    let id = null
    const guildEmojies = this.foundEmotes.get(guildId)
    for (const emote of EmotesPriority) {
      const emoteId = guildEmojies[emote]
      if (emoteId) {
        id = emoteId
      }
    }
    const emoji = message.guild.emojis.cache.get(id)
    return `Да живой я, отъебись ${emoji}`
  }

  private getReplyForBan (message: Message): string {
    const mentioned = [...message.mentions.users.values()]
    if (!mentioned[1] && mentioned[0]?.equals(this.client.user)) {
      const guildEmojis = this.foundEmotes.get(message.guild.id)
      if (guildEmojis[EEmotes.PepeGhoul]) {
        return `${message.author} себя забань животное ${message.guild.emojis.cache.get(guildEmojis[EEmotes.PepeGhoul])}`
      } else if (guildEmojis[EEmotes.PeepoChill]) {
        return `Отъебись ${message.guild.emojis.cache.get(guildEmojis[EEmotes.PeepoChill])}`
      }
    }
    return null
  }

  private getReplyForCommand (command: ECommands, message: Message): string {
    switch (command) {
      case ECommands.status: return this.getReplyForStatus(message.guild.id, message)
      case ECommands.ban: return this.getReplyForBan(message)
      default: return null
    }
  }

  private initListeners (): void {
    this.client.on('ready', (): void => {
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
    })

    this.client.on('error', (error: Error): void => {
      this.logger.error('Error: ', error.message)
    })

    this.client.on('message', async (message: Message): Promise<void> => {
      // await message.react(this.foundEmotes.get(message.guild.id)[EEmotes.PeepoChill])
      if (message.author.bot) return

      if (message.content[0] === '!') {
        const command = <ECommands>(/!*(\w*).*/g).exec(message.content)[1]
        const reply = this.getReplyForCommand(command, message)
        if (reply) {
          await message.channel.send(reply)
        }
      }
    })
  }

  public getStatus (): EDiscordStatuses {
    return EDiscordStatuses.RUNNING
  }

  public async login (): Promise<void> {
    await this.client.login(this.config.token)
  }
}
