import { Message } from 'discord.js'

import { EQuoteTypes, IGetQuoteResponse } from '../types'

const getTextQuote = async (message: Message): Promise<IGetQuoteResponse<EQuoteTypes.text>> => {
  let quote = message.content
  let match: RegExpExecArray
  // eslint-disable-next-line no-cond-assign
  while (match = /<@([!&])?(\d*?)>/gm.exec(quote)) {
    switch (match[1]) { // replace pings
      case '!':
      case undefined: {
        const member = await message.guild.members.fetch(match[2])
        quote = quote.replace(match[0], `@${member.displayName}`)
        break
      }
      case '&': { // replace role pings
        const role = await message.guild.roles.fetch(match[2])
        quote = quote.replace(match[0], `@${role.name}`)
        break
      }
    }
  }
  quote = quote
    .replace(/\n/g, '\n> ') // multiline quote
    .replace(/@here/g, '\\@here') // not to ping here
    .replace(/@everyone/g, '\\@everyone') // not to ping everyone

  return {
    type: EQuoteTypes.text,
    content: `> ${quote}`,
  }
}

const getTxtAttachmentQuote = async (message: Message): Promise<IGetQuoteResponse<EQuoteTypes.attachment>> => {
  return {
    type: EQuoteTypes.attachment,
    content: [{
      attachment: Buffer.from(message.content),
      name: 'quote.txt',
    }],
  }
}

export const getQuote = async (message: Message): Promise<IGetQuoteResponse<EQuoteTypes>> => {
  if (message.content.split('\n').length > 8 || message.content.length > 550) {
    return getTxtAttachmentQuote(message)
  }

  return getTextQuote(message)
}
