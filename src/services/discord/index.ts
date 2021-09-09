import { Client, Message } from 'discord.js'

import { Logger } from '../../libs/logger'

import { EDiscordStatuses, IDiscordConfig } from './types'
import { ECommands, EKeywords, Keywords } from './assets/slash-commands'
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
    const mentions = [...message.mentions.users.values()]
    if (mentions.length === 1 && mentions[0].equals(this.client.user)) {
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

  private getReplyForSorry (message: Message): string {
    const guildEmojis = this.foundEmotes.get(message.guild.id)
    let emoji = null
    if (guildEmojis[EEmotes.pepeChill]) {
      emoji = message.guild.emojis.cache.get(guildEmojis[EEmotes.pepeChill])
    } else if (guildEmojis[EEmotes.PeepoChill]) {
      emoji = message.guild.emojis.cache.get(guildEmojis[EEmotes.PeepoChill])
    }
    return `${message.author} ты прощен${emoji ? ` ${emoji}` : ''}`
  }

  private getMatchedKeyWord (text: string): EKeywords {
    if (!text) return null

    const formattedText = text.toLowerCase()
    for (const key of Object.values(EKeywords)) {
      if (Keywords[key].includes(formattedText)) return key
    }
    return null
  }

  private getReplyForText (message: Message): string {
    const mentions = [...message.mentions.users.values()]
    if (mentions.length === 1 && mentions[0].equals(this.client.user)) {
      let text = null
      for (const line of message.content.split('\n')) {
        let toBreak = false
        for (const regexp of [/^([a-zA-Zа-яА-Я ]*) <.*?>$/g, /^<.*?> ([a-zA-Zа-яА-Я ]*)$/g]) {
          const textWithPing = regexp.exec(line)
          if (typeof textWithPing?.[1] === 'string') {
            if (text) {
              text = null
              toBreak = true
              break
            }
            text = textWithPing[1]
          }
        }
        if (toBreak) break
      }
      if (!text) return null

      const matchedKeyword = this.getMatchedKeyWord(text)
      switch (matchedKeyword) {
        case EKeywords.sorry: return this.getReplyForSorry(message)
      }
    }
    return null
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
      if (message.author.bot) return

      let reply = this.getReplyForText(message)
      if (!reply && message.content[0] === '!') {
        const command = <ECommands>(/!*(\w*).*/g).exec(message.content)[1]
        reply = this.getReplyForCommand(command, message)
      }
      if (reply) {
        await message.channel.send(reply)
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
