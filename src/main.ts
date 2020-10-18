import Discord from 'discord.js'

import { DiscordClient, DiscordClientCommands } from './discord-client'
import { MinecraftServer, MinecraftServerEvents } from './minecraft-server'

const MAX_DISCORD_MESSAGE_LENGTH = 1000

async function main() {
  const discordClient = new DiscordClient()
  const minecraftServer = new MinecraftServer()

  let maxPlayerCount = 0
  let isServerRunning = false

  const sendAlreadyRunningRCONMessage = async () => {
    const emoji = await discordClient.getEmojiID('feelsokayman')
    discordClient.broadcastMessage(
      `Currently processing an RCON command already, pls send try again later ${emoji}`,
    )
  }

  const offlineText = ':red_circle: Offline'

  const formatStatusText = (status: string) =>
    `Status: ${status} | Host: home.jeremyasuncion.io`

  const formatOnlineStatus = (count: number, max: number) =>
    `:green_circle: ${count} / ${max}`

  const broadcastStatus = (status: string) =>
    discordClient.broadcastMessage(formatStatusText(status))

  const broadcastOfflineStatus = () => broadcastStatus(offlineText)

  const broadcastLoadingStatus = (text: string) =>
    broadcastStatus(`:yellow_circle: ${text}`)

  const broadcastOnlineStatus = (count: number, max: number) =>
    broadcastStatus(formatOnlineStatus(count, max))

  const broadcastStatusWithPlayerCount = async () => {
    const count = await minecraftServer.fetchPlayerCount()
    broadcastOnlineStatus(count, maxPlayerCount)
  }

  const sendServerConflictingStatus = async (
    channel: Discord.TextChannel,
    text: string,
  ) => {
    const emoji = await discordClient.getEmojiID('feelsokayman')
    channel.send(`Server is currently ${text} ${emoji}`)
  }

  discordClient.on(
    DiscordClientCommands.SendCommand,
    async (channel: Discord.TextChannel, command: string) => {
      if (!isServerRunning) {
        sendServerConflictingStatus(channel, 'stopped')
      } else if (minecraftServer.isSendingRCONCommand) {
        await sendAlreadyRunningRCONMessage()
      } else {
        let response = await minecraftServer.sendRCONCommand(command)
        const requests = []

        while (response) {
          const chunk = response.slice(0, MAX_DISCORD_MESSAGE_LENGTH)
          console.log('chunk:', chunk)
          response = response.slice(MAX_DISCORD_MESSAGE_LENGTH)

          requests.push(
            channel.send(`
            Response for command \`${command}\`:

            \`\`\`
            ${chunk}
            \`\`\`
            `),
          )
        }

        await Promise.all(requests)
      }
    },
  )

  discordClient.on(
    DiscordClientCommands.PlayerList,
    async (channel: Discord.TextChannel) => {
      if (!isServerRunning) {
        sendServerConflictingStatus(channel, 'stopped')
      } else if (minecraftServer.isSendingRCONCommand) {
        await sendAlreadyRunningRCONMessage()
      } else {
        const { players } = await minecraftServer.fetchPlayerList()
        const emoji = await discordClient.getEmojiID('peepoSad')

        const message =
          players.length > 0
            ? `
      Player List:
      ${players.reduce((result, player) => result + `- ${player}\n`, '')}
      `
            : `No players in the server ${emoji}`
        await channel.send(message)
      }
    },
  )

  discordClient.on(
    DiscordClientCommands.StartServer,
    async (channel: Discord.TextChannel) => {
      if (isServerRunning) {
        sendServerConflictingStatus(channel, 'running')
        return
      }

      await broadcastLoadingStatus('Starting server...')

      const emoji = await discordClient.getEmojiID('HYPERS')
      await minecraftServer.start()
      await discordClient.broadcastMessage(`Minecraft server started ${emoji}`)

      const details = await minecraftServer.fetchPlayerList()
      maxPlayerCount = details.max
      await broadcastOnlineStatus(0, maxPlayerCount)

      isServerRunning = true
    },
  )

  discordClient.on(
    DiscordClientCommands.StopServer,
    async (channel: Discord.TextChannel) => {
      if (!isServerRunning) {
        sendServerConflictingStatus(channel, 'stopped')
        return
      }

      await broadcastLoadingStatus('Stopping server...')

      await minecraftServer.stop()
      const emoji = await discordClient.getEmojiID('peepoBlanket')
      await Promise.all([
        discordClient.broadcastMessage(`Minecraft server stopped ${emoji}`),
        broadcastOfflineStatus(),
      ])

      isServerRunning = false
    },
  )

  discordClient.on(
    DiscordClientCommands.Status,
    async (channel: Discord.TextChannel) => {
      const status = isServerRunning
        ? formatOnlineStatus(
            await minecraftServer.fetchPlayerCount(),
            maxPlayerCount,
          )
        : offlineText

      channel.send(formatStatusText(status))
    },
  )

  minecraftServer.on(MinecraftServerEvents.PlayerJoined, async username => {
    const emoji = await discordClient.getEmojiID('POGGERS')
    await Promise.all([
      discordClient.broadcastMessage(`${username} joined the server ${emoji}`),
      broadcastStatusWithPlayerCount(),
    ])
  })

  minecraftServer.on(MinecraftServerEvents.PlayerLeft, async username => {
    const emoji = await discordClient.getEmojiID('Sadge')
    await Promise.all([
      discordClient.broadcastMessage(`${username} left the server ${emoji}`),
      broadcastStatusWithPlayerCount(),
    ])
  })

  minecraftServer.on(MinecraftServerEvents.Error, async message => {
    const [salute1, salute2] = await Promise.all([
      await discordClient.getEmojiID('salute1'),
      await discordClient.getEmojiID('salute2'),
    ])
    await discordClient.broadcastMessage(
      `Server error: \`${message}\` ${salute1} ${salute2}`,
    )
  })

  console.log('Starting Discord client...')
  await discordClient.start()
  console.log('Discord client started!')
  await broadcastOfflineStatus()
}

main()
