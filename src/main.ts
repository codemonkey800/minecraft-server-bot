import Discord from 'discord.js'

import { DiscordClient, DiscordClientCommands } from './discord-client'
import { MinecraftServer, MinecraftServerEvents } from './minecraft-server'

async function main() {
  const discordClient = new DiscordClient()
  const minecraftServer = new MinecraftServer()

  let maxPlayerCount = 0
  let isServerRunning = false

  const sendAlreadyRunningRCONMessage = () =>
    discordClient.broadcastMessage(
      'Currently processing an RCON command already, pls send try again later :feelsokayman:',
    )

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

  const sendServerIsStoppedMessage = (channel: Discord.TextChannel) =>
    channel.send('Server is already stopped :feelsokayman:')

  discordClient.on(
    DiscordClientCommands.SendCommand,
    async (channel: Discord.TextChannel, command: string) => {
      if (!isServerRunning) {
        sendServerIsStoppedMessage(channel)
      } else if (minecraftServer.isSendingRCONCommand) {
        await sendAlreadyRunningRCONMessage()
      } else {
        const response = await minecraftServer.sendRCONCommand(command)

        await channel.send(`
      Response for command \`${command}\`:

      \`\`\`
      ${response}
      \`\`\`
      `)
      }
    },
  )

  discordClient.on(
    DiscordClientCommands.PlayerList,
    async (channel: Discord.TextChannel) => {
      if (!isServerRunning) {
        sendServerIsStoppedMessage(channel)
      } else if (minecraftServer.isSendingRCONCommand) {
        await sendAlreadyRunningRCONMessage()
      } else {
        const { players } = await minecraftServer.fetchPlayerList()

        const message =
          players.length > 0
            ? `
      Player List:
      ${players.reduce((result, player) => result + `- ${player}\n`, '')}
      `
            : 'No players in the server :peepoSad:'
        await channel.send(message)
      }
    },
  )

  discordClient.on(
    DiscordClientCommands.StartServer,
    async (channel: Discord.TextChannel) => {
      if (isServerRunning) {
        sendServerIsStoppedMessage(channel)
        return
      }

      await broadcastLoadingStatus('Starting server...')

      await minecraftServer.start()
      await discordClient.broadcastMessage('Minecraft server started :HYPERS:')

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
        sendServerIsStoppedMessage(channel)
        return
      }

      await broadcastLoadingStatus('Stopping server...')

      await minecraftServer.stop()
      await Promise.all([
        discordClient.broadcastMessage(
          'Minecraft server stopped :peepoBlanket:',
        ),
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
    await Promise.all([
      discordClient.broadcastMessage(`${username} joined the server :POGGERS:`),
      broadcastStatusWithPlayerCount(),
    ])
  })

  minecraftServer.on(MinecraftServerEvents.PlayerLeft, async username => {
    await Promise.all([
      discordClient.broadcastMessage(`${username} left the server :Sadge:`),
      broadcastStatusWithPlayerCount(),
    ])
  })

  minecraftServer.on(MinecraftServerEvents.Error, async message => {
    await discordClient.broadcastMessage(
      `Server error: \`${message}\` :salute1: :salute2:`,
    )
  })

  console.log('Starting Discord client...')
  await discordClient.start()
  console.log('Discord client started!')
  await broadcastOfflineStatus()
}

main()
