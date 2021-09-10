import { Client, GuildChannel, Message, TextChannel } from 'discord.js'

import axios, { AxiosInstance } from 'axios'

import { Logger } from '../../libs/logger'
import { constants } from '../../configs/constants'

import { createIdByTemplateFactory } from '../../utils/id-by-template'

import { Action, ActionTypes, IDiscordConfig } from './types'
import { ECommands, EKeywords, Keywords } from './assets/commands'
import { EEmotes, EmotesPriority } from './assets/emotes'

type IChatBotConfig = Readonly<{
  categoryName: string
  generalName: string
  rooms: {
    [channelId: string]: {
      answering: boolean
      uid: string
    }
  }
  xusuApi: AxiosInstance
  xusuBotName: string
  idByTemplateFactory: Function
}>

export class Discord {
  private readonly foundEmotes = new Map<string, { [emojiName: string]: string }>()
  private readonly client = new Client()
  private readonly logger = new Logger('DISCORD-CLIENT')
  private readonly config: IDiscordConfig
  private statusCallTimeout = new Date()
  private statusCallExceededTimes = 0
  private readonly chatBotConfig: IChatBotConfig

  constructor (config: IDiscordConfig) {
    this.chatBotConfig = {
      categoryName: constants.chatbot.categoryName,
      generalName: constants.chatbot.generalChannelName,
      rooms: {},
      xusuApi: axios.create({
        baseURL: constants.chatbot.xusuApiUrl,
      }),
      xusuBotName: constants.chatbot.xusuBotName,
      idByTemplateFactory: createIdByTemplateFactory(constants.chatbot.idCharactersRange, constants.chatbot.idTemplate),
    }
    this.initListeners()
    this.config = config
  }

  private getReplyForStatus (guildId: string, message: Message): Action<ActionTypes.REPLY> {
    if (this.statusCallTimeout.getTime() > Date.now()) {
      if (this.statusCallExceededTimes === 1) {
        this.statusCallExceededTimes += 1
        return {
          message: 'По медленней, еще раз и иди нахуй :/',
          type: ActionTypes.REPLY,
        }
      } else if (this.statusCallExceededTimes === 2) {
        this.statusCallExceededTimes += 1
        return {
          message: 'Лан, пошли нахуй',
          type: ActionTypes.REPLY,
        }
      }
      return null
    }

    this.statusCallExceededTimes = 1
    this.statusCallTimeout = new Date(Date.now() + constants.statusTimeoutMs)

    let id = null
    const guildEmojies = this.foundEmotes.get(guildId)
    for (const emote of EmotesPriority) {
      const emoteId = guildEmojies[emote]
      if (emoteId) {
        id = emoteId
      }
    }
    const emoji = message.guild.emojis.cache.get(id)
    return {
      message: `Да живой я, отъебись ${emoji}`,
      type: ActionTypes.REPLY,
    }
  }

  private getReplyForBan (message: Message): Action<ActionTypes.REPLY> {
    const mentions = [...message.mentions.users.values()]
    if (mentions.length === 1 && mentions[0].equals(this.client.user)) {
      const guildEmojis = this.foundEmotes.get(message.guild.id)
      if (guildEmojis[EEmotes.PepeGhoul]) {
        return {
          message: `${message.author} себя забань животное ${message.guild.emojis.cache.get(guildEmojis[EEmotes.PepeGhoul])}`,
          type: ActionTypes.REPLY,
        }
      } else if (guildEmojis[EEmotes.PeepoChill]) {
        return {
          message: `Отъебись ${message.guild.emojis.cache.get(guildEmojis[EEmotes.PeepoChill])}`,
          type: ActionTypes.REPLY,
        }
      }
    }
    return null
  }

  private getActionForCommand (command: ECommands, message: Message): Action<ActionTypes> {
    switch (command) {
      case ECommands.status: return this.getReplyForStatus(message.guild.id, message)
      case ECommands.ban: return this.getReplyForBan(message)
      default: return null
    }
  }

  private getReplyForSorry (message: Message): Action<ActionTypes.REPLY> {
    const guildEmojis = this.foundEmotes.get(message.guild.id)
    let emoji = null
    if (guildEmojis[EEmotes.pepeChill]) {
      emoji = message.guild.emojis.cache.get(guildEmojis[EEmotes.pepeChill])
    } else if (guildEmojis[EEmotes.PeepoChill]) {
      emoji = message.guild.emojis.cache.get(guildEmojis[EEmotes.PeepoChill])
    }
    return {
      message: `${message.author} ты прощен${emoji ? ` ${emoji}` : ''}`,
      type: ActionTypes.REPLY,
    }
  }

  private getMatchedKeyWord (text: string): EKeywords {
    if (!text) return null

    const formattedText = text.toLowerCase()
    for (const key of Object.values(EKeywords)) {
      if (Keywords[key].includes(formattedText)) return key
    }
    return null
  }

  private getReplyForText (message: Message): Action<ActionTypes.REPLY> {
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

  private async processChatBotMessage (message: Message): Promise<void> {
    if (this.chatBotConfig.rooms[message.channel.id].answering) return
    void message.channel.startTyping()
    this.chatBotConfig.rooms[message.channel.id].answering = true

    let reply: string
    const requestedMessage = message.content.replace(/<.*?>/g, '').replace(/\s{2,}/g, ' ').trim()
    if (requestedMessage && !requestedMessage.match(constants.urlRegex)) {
      try {
        const { data } = await this.chatBotConfig.xusuApi.post('/send', {
          bot: this.chatBotConfig.xusuBotName,
          text: requestedMessage,
          uid: this.chatBotConfig.rooms[message.channel.id].uid,
        })
        if (!data?.ok) {
          throw new Error(JSON.stringify(data))
        }
        this.chatBotConfig.rooms[message.channel.id].uid = data.uid
        reply = data.text
      } catch (e) {
        const errorMessage = e.response?.data ? JSON.stringify(e.response.data) : e.message
        reply = `Error - ${errorMessage}`
        this.logger.error(`Error on xusu [${constants.chatbot.xusuApiUrl}/send] request with params ${JSON.stringify({
          bot: this.chatBotConfig.xusuBotName,
          text: message.content,
          uid: this.chatBotConfig.rooms[message.channel.id].uid,
        })} - ${errorMessage}`)
      }
      await message.channel.send(`> ${message.content}\n${message.author} ${reply}`)
    }

    void message.channel.stopTyping(true)
    this.chatBotConfig.rooms[message.channel.id].answering = false
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
        let newCategory = false

        let category = guild.channels.cache.find(c => {
          return c.type === 'category' && c.name === this.chatBotConfig.categoryName
        })
        if (!category) {
          try {
            category = await guild.channels.create(this.chatBotConfig.categoryName, { type: 'category' })
          } catch (e) {
            this.logger.error(`Failed to create category ${this.chatBotConfig.categoryName} - ${e.message}`)
            continue
          }
          newCategory = true
        }

        let generalChannel: GuildChannel = null
        if (!newCategory) {
          generalChannel = guild.channels.cache.find(c => {
            return c.type === 'text' && c.parentID === category.id && c.name === this.chatBotConfig.generalName
          })
        }
        if (!generalChannel) {
          try {
            generalChannel = await guild.channels.create(this.chatBotConfig.generalName, {
              type: 'text',
              parent: category.id,
            })
          } catch (e) {
            this.logger.error(`Failed to create channel ${this.chatBotConfig.generalName} - ${e.message}`)
            await category.delete(`Failed to create channel ${this.chatBotConfig.generalName} - ${e.message}`)
          }
        }

        this.chatBotConfig.rooms[generalChannel.id] = {
          answering: false,
          uid: null,
        }
      }
    })

    this.client.on('error', (error: Error): void => {
      this.logger.error('Error: ', error.message)
    })

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.client.on('message', async (message: Message): Promise<void> => {
      if (message.author.bot) return

      if ((<TextChannel>message.channel).parent.name === this.chatBotConfig.categoryName) {
        return await this.processChatBotMessage(message)
      }

      {
        const reply = this.getReplyForText(message)
        if (reply) {
          await message.channel.send(reply.message)
          return
        }
      }

      if (message.content[0] === '!') {
        const command = <ECommands>(/!*(\w*).*/g).exec(message.content)[1]
        const actionForCommand = this.getActionForCommand(command, message)
        if (!actionForCommand) {
          return
        }

        switch (actionForCommand.type) {
          case ActionTypes.REPLY: {
            await message.channel.send((<Action<ActionTypes.REPLY>>actionForCommand).message)
            break
          }
          case ActionTypes.SET: {
            break
          }
        }
      }
    })
  }

  public async login (): Promise<void> {
    await this.client.login(this.config.token)
  }
}
