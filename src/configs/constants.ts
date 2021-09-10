export const constants = {
  statusTimeoutMs: Number(process.env.STATUS_TIMEOUT_MS) || 60000,
  chatbot: {
    categoryName: process.env.CHAT_BOT_CATEGORY_NAME,
    generalChannelName: 'general',
    idCharactersRange: 'a-zA-Z0-9',
    idTemplate: '********-****-****-****-************',
    xusuApiUrl: 'https://xu.su/api',
    xusuBotName: 'kristina',
  },
  urlRegex: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=+$,\w]+@)?[A-Za-z0-9.-]+|(?:www\.|[-;:&=+$,\w]+@)[A-Za-z0-9.-]+)((?:\/[+~%/.\w\-_]*)?\??(?:[-+=&;%@\.\w_]*)#?(?:[.!/\\\w]*))?)/,
} as const
