import { Client, Intents, Interaction, Message } from 'discord.js'

import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'

import { Logger } from '../../libs/logger'

import { EDiscordStatuses, IDiscordConfig, TFoundEmotes } from './types'
import { SlashCommands, ECommands, ISlashCommand } from './assets/slash-commands'
import { EEmotes } from './assets/emotes'

interface IRestCommand {
  id: string
  application_id: string
  name: string
  description: string
  version: string
  default_permission: boolean
  type: number
}

export class Discord {
  private readonly foundEmotes: TFoundEmotes = new Map<EEmotes, { [guildId: string]: string }>()
  private readonly client: Client
  private readonly logger: Logger
  private readonly config: IDiscordConfig
  private interactionTimeout = new Date()
  private timeoutExceedTimes = 0

  constructor (config: IDiscordConfig) {
    this.client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
      ],
    })
    this.logger = new Logger('DISCORD-CLIENT')
    this.initListeners()
    this.config = config
  }

  private getReplyForCommand (command: ECommands, guildId: string): string {
    if (this.interactionTimeout.getTime() > Date.now()) {
      if (this.timeoutExceedTimes === 1) {
        this.timeoutExceedTimes += 1
        return 'По медленней, еще раз и иди нахуй :/'
      } else if (this.timeoutExceedTimes === 2) {
        this.timeoutExceedTimes += 1
        return 'Лан, пошли нахуй :/'
      }
      return null
    }

    this.timeoutExceedTimes = 0
    if (command === ECommands.status) {
      this.timeoutExceedTimes += 1
      this.interactionTimeout = new Date(Date.now() + 1000 * 60 * 5)
      let type = null
      if (this.foundEmotes.get(EEmotes.pepeGhoul)?.[guildId]) {
        type = EEmotes.pepeGhoul
      } else if (this.foundEmotes.get(EEmotes.peepoChill)?.[guildId]) {
        type = EEmotes.peepoChill
      }
      const emojiOnGuild = this.foundEmotes.get(type)?.[guildId]
      return `Да живой я, отъебись${emojiOnGuild ? ` <:${type}:${emojiOnGuild}>` : ''}`
    }

    return null
  }

  private initListeners (): void {
    this.client.on('ready', async (): Promise<void> => {
      this.logger.info(`Logged in as: ${this.client.user.tag}`)

      const emojis = this.client.emojis.cache
      for (const [emojiId, emoji] of emojis) {
        const emojiName = <EEmotes>emoji.name
        const newEmojiData = {
          [emoji.guild.id]: emojiId,
        }
        const savedEmojisData = this.foundEmotes.get(emojiName)
        if (savedEmojisData) {
          if (!savedEmojisData[emoji.guild.id]) {
            this.foundEmotes.set(emojiName, Object.assign(savedEmojisData, newEmojiData))
          }
        } else {
          this.foundEmotes.set(emojiName, newEmojiData)
        }
      }
    })

    this.client.on('error', (error: Error): void => {
      this.logger.error('Error: ', error.message)
    })

    this.client.on('messageCreate', async (message: Message): Promise<void> => {
      // const emojiOnGuild = this.foundEmotes.get(EEmotes.peepoChill)?.[message.guildId]
      //
      // if (emojiOnGuild) {
      //   await message.react(emojiOnGuild)
      // }
      if (message.content.match(/^!\w*$/g)) {
        const command = message.content.slice(1)
        const reply = this.getReplyForCommand(<ECommands>command, message.guildId)
        if (reply) {
          await message.reply(reply)
        }
      }
    })

    this.client.on('interactionCreate', async (interaction: Interaction): Promise<void> => {
      if (!interaction.isCommand()) return
      const reply = this.getReplyForCommand(<ECommands>interaction.commandName, interaction.guildId)
      if (reply) {
        await interaction.reply({
          content: reply,
          ephemeral: true,
        })
      }
    })
  }

  public getStatus (): EDiscordStatuses {
    return EDiscordStatuses.RUNNING
  }

  public async login (): Promise<void> {
    const rest = new REST({ version: '9' }).setToken(this.config.token)
    const registeredCommands: IRestCommand[] = <any> await rest.get(
      Routes.applicationCommands(this.config.applicationId),
    )

    const commandsToRegister: ISlashCommand[] = []
    for (const registeredCommand of registeredCommands) {
      const foundCommand = SlashCommands.find(c => c.name === registeredCommand.name)
      if (foundCommand) {
        if (foundCommand.description !== registeredCommand.description) {
          commandsToRegister.push(foundCommand)
        }
      } else {
        commandsToRegister.push(foundCommand)
      }
    }
    if (commandsToRegister.length > 0) {
      await rest.put(
        Routes.applicationCommands(this.config.applicationId), {
          body: commandsToRegister,
        },
      )
    }
    await this.client.login(this.config.token)
  }
}
