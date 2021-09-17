import axios from 'axios'
import { Guild, GuildChannel, Message, TextChannel } from 'discord.js'

import { constants } from '../../../../configs/constants'
import { createIdByTemplateFactory } from '../../../../utils/id-by-template'

import { Shared } from '../shared'

import { IChatBotConfig } from './types'

export class ChatBotModule extends Shared {
  private readonly chatBotConfig: IChatBotConfig

  private async getReplyFromChatBot (text: string, message: Message): Promise<string> {
    try {
      const { data } = await this.chatBotConfig.xusuApi.post('/send', {
        bot: this.chatBotConfig.xusuBotName,
        text: text,
        uid: this.chatBotConfig.rooms[message.guild.id][message.channel.id].uids[message.author.id],
      })
      if (!data?.ok) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(JSON.stringify(data))
      }
      this.chatBotConfig.rooms[message.guild.id][message.channel.id].uids[message.author.id] = data.uid
      return data.text
    } catch (e) {
      const errorMessage = e.response?.data ? JSON.stringify(e.response.data) : e.message
      throw new Error(errorMessage)
    }
  }

  private async processChatBotMessage (message: Message): Promise<void> {
    const roomConfig = this.chatBotConfig.rooms[message.guild.id][message.channel.id]
    if (roomConfig.answering) return
    void message.channel.startTyping()
    this.chatBotConfig.rooms[message.guild.id][message.channel.id].answering = true

    const requestedMessage = message.content.replace(/<.*?>/g, '').replace(/\s{2,}/g, ' ').trim()
    if (message.mentions.users.get(this.client.user.id) || (!requestedMessage.match(constants.urlRegex) && requestedMessage)) {
      let reply: string
      try {
        reply = await this.getReplyFromChatBot(requestedMessage, message)
      } catch (ignore) {
        roomConfig.uids[message.author.id] = null
        try {
          reply = await this.getReplyFromChatBot(requestedMessage, message)
        } catch (e) {
          this.logger.error(`Error on xusu [${constants.chatbot.xusuApiUrl}/send] request with params ${JSON.stringify({
            bot: this.chatBotConfig.xusuBotName,
            text: message.content,
            uid: roomConfig.uids[message.author.id],
          })} - ${e.message}`)
          reply = `Error - ${e.message}`
        }
      }

      let quote = message.content
      let match: RegExpExecArray = null
      // eslint-disable-next-line no-cond-assign
      while (match = /<@!(\d*?)>/gm.exec(quote)) {
        const member = await message.guild.members.fetch(match[1])
        quote = quote.replace(match[0], `@${member.displayName}`)
      }
      await message.channel.send(`> ${quote.replace(/\n/g, '\n> ')}\n${message.author} ${reply}`)
    }

    roomConfig.answering = false
    this.chatBotConfig.rooms[message.guild.id][message.channel.id] = roomConfig
    void message.channel.stopTyping(true)
  }

  private async createChannels (guild: Guild): Promise<void> {
    let newCategory = false

    let category = guild.channels.cache.find(c => {
      return c.type === 'category' && c.name === this.chatBotConfig.categoryName
    })
    if (!category) {
      try {
        category = await guild.channels.create(this.chatBotConfig.categoryName, { type: 'category' })
      } catch (e) {
        this.logger.error(`Failed to create category ${this.chatBotConfig.categoryName} - ${e.message}`)
        return
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
        return
      }
    }

    this.chatBotConfig.rooms[guild.id] = {
      [generalChannel.id]: {
        answering: false,
        uids: {},
      },
    }
  }

  constructor (...args: any) {
    super(args)
    this.chatBotConfig = {
      categoryName: constants.chatbot.categoryName,
      generalName: constants.chatbot.generalChannelName,
      botToBotName: constants.chatbot.botToBotName,
      rooms: {},
      xusuApi: axios.create({
        baseURL: constants.chatbot.xusuApiUrl,
      }),
      xusuBotName: constants.chatbot.xusuBotName,
      idByTemplateFactory: createIdByTemplateFactory(constants.chatbot.idCharactersRange, constants.chatbot.idTemplate),
    }

    this.listeners.add('initGuild', async (guild: Guild) => {
      await this.createChannels(guild)
    })
    this.listeners.add('deleteGuild', (guild: Guild) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.chatBotConfig.rooms[guild.id]
    })

    this.listeners.add('onMessage', async (message: Message): Promise<boolean> => {
      if ((<TextChannel>message.channel).parent.name === this.chatBotConfig.categoryName) {
        await this.processChatBotMessage(message)
        return true
      }
      return false
    })
  }
}
