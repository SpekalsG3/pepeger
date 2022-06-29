import { Message } from 'discord.js'

import { Action, ActionTypes, IContext } from '../../types'
import { ECommands, EKeywords, Keywords } from '../../assets/commands'
import { EEmotes, EmotesPriority } from '../../assets/emotes'
import { constants } from '../../../../configs/constants'

export class CommandsModule {
  private readonly ctx: IContext
  private statusCallTimeout = new Date()
  private statusCallExceededTimes = 0

  private static getMatchedKeyWord (text: string): EKeywords {
    if (!text) return null

    const formattedText = text.toLowerCase()
    for (const key of Object.values(EKeywords)) {
      if (Keywords[key].includes(formattedText)) return key
    }
    return null
  }

  private getReplyForSorry (message: Message): Action<ActionTypes.REPLY> {
    const guildEmojis = this.ctx.foundEmotes.get(message.guild.id)
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

  private getReplyForText (message: Message): Action<ActionTypes.REPLY> {
    const mentions = [...message.mentions.users.values()]
    if (mentions.length === 1 && mentions[0].equals(this.ctx.client.user)) {
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

      const matchedKeyword = CommandsModule.getMatchedKeyWord(text)
      switch (matchedKeyword) {
        case EKeywords.sorry:
          return this.getReplyForSorry(message)
      }
    }
    return null
  }

  private getReplyForStatus (guildId: string, message: Message): Action<ActionTypes.REPLY> {
    if (this.statusCallTimeout.getTime() > Date.now()) {
      if (this.statusCallExceededTimes === 1) {
        this.statusCallExceededTimes += 1
        return {
          message: 'По медленней, еще раз будет последний :/',
          type: ActionTypes.REPLY,
        }
      } else if (this.statusCallExceededTimes === 2) {
        this.statusCallExceededTimes += 1
        return {
          message: 'Лан, бб',
          type: ActionTypes.REPLY,
        }
      }
      return null
    }

    this.statusCallExceededTimes = 1
    this.statusCallTimeout = new Date(Date.now() + constants.statusTimeoutMs)

    let id = null
    const guildEmojies = this.ctx.foundEmotes.get(guildId)
    for (const emote of EmotesPriority) {
      const emoteId = guildEmojies[emote]
      if (emoteId) {
        id = emoteId
      }
    }
    const emoji = message.guild.emojis.cache.get(id)
    return {
      message: `Да живой я ${emoji}`,
      type: ActionTypes.REPLY,
    }
  }

  private getReplyForBan (message: Message): Action<ActionTypes.REPLY> {
    const mentions = [...message.mentions.users.values()]
    if (mentions.length === 1 && mentions[0].equals(this.ctx.client.user)) {
      const guildEmojis = this.ctx.foundEmotes.get(message.guild.id)
      if (guildEmojis[EEmotes.PepeGhoul]) {
        return {
          message: `${message.author} себя забань ${message.guild.emojis.cache.get(guildEmojis[EEmotes.PepeGhoul])}`,
          type: ActionTypes.REPLY,
        }
      } else if (guildEmojis[EEmotes.PeepoChill]) {
        return {
          message: `Не выйдет ${message.guild.emojis.cache.get(guildEmojis[EEmotes.PeepoChill])}`,
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

  constructor (ctx: IContext) {
    this.ctx = ctx

    this.ctx.listeners.add('onMessage', async (message: Message): Promise<boolean> => {
      { // enclose `reply` in local scope
        const reply = this.getReplyForText(message)
        if (reply) {
          await message.channel.send(reply.message)
          return true
        }
      }

      if (message.content[0] === '!') {
        const command = <ECommands>(/!*(\w*).*/g).exec(message.content)[1]
        const actionForCommand = this.getActionForCommand(command, message)
        if (!actionForCommand) {
          return false
        }

        switch (actionForCommand.type) {
          case ActionTypes.REPLY: {
            await message.channel.send((<Action<ActionTypes.REPLY>>actionForCommand).message)
            break
          }
          default: return false
        }

        return true
      }

      return false
    })
  }
}
