import 'dotenv/config'
import { Discord } from './services/discord'
import { DISCORD_CONFIG } from './configs/credentials'

const start = async (): Promise<void> => {
  const bot = new Discord(DISCORD_CONFIG)
  await bot.login()
}

void start()
