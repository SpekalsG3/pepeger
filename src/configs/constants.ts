const possibleBotNames = [
  'kristina', // кристина
  'бот-онлайн', // неизвестный
  'чат-с-девушкой', // незнакомка
  'чат-бот-киса', // киса
  'Тян', // тян
  '3333', // троечница
  'gamer', // геймер
  'sponge-bot', // спанч бот
  'GiN', // джин
  'hero', // герой
  'сапожник', // сапожник
  'Добрый', // добрый
]

if (!possibleBotNames.includes(process.env.CHAT_BOT_BOT_NAME)) {
  throw new Error(`Invalid bot name: ${process.env.CHAT_BOT_BOT_NAME}. Possible names are: '${possibleBotNames.join('\', \'')}'`)
}

export const constants = {
  statusTimeoutMs: Number(process.env.STATUS_TIMEOUT_MS) || 60000,
  chatbot: {
    categoryName: process.env.CHAT_BOT_CATEGORY_NAME,
    generalChannelName: 'general',
    botToBotName: 'bot-to-bot',
    idCharactersRange: 'a-zA-Z0-9',
    idTemplate: '********-****-****-****-************',
    xusuApiUrl: 'https://xu.su/api',
    xusuBotName: process.env.CHAT_BOT_BOT_NAME,
  },
  urlRegex: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??[-+=&;%@.\w_]*#?[.!/\\\w]*)?)/,
} as const
