import Discord from 'discord.js'
import { EventEmitter } from 'events'

import { env } from './utils'

const DISCORD_BOT_CHANNEL = env('DISCORD_BOT_CHANNEL')
const DISCORD_BOT_TOKEN = env('DISCORD_BOT_TOKEN')

export enum DiscordClientCommands {
  Help = '!help',
  PlayerList = '!list',
  SendCommand = '!command',
  StartServer = '!start',
  Status = '!status',
  StopServer = '!stop',
}

export class DiscordClient extends EventEmitter {
  private client = new Discord.Client()

  async start(): Promise<void> {
    this.client.on('message', message => {
      if (!this.canRespondToMessage(message)) {
        return
      }

      const handlers: Array<{
        command: DiscordClientCommands
        handler: (channel: Discord.TextChannel, ...args: any[]) => void
      }> = [
        {
          command: DiscordClientCommands.Help,
          handler: this.handleHelpCommand,
        },
        {
          command: DiscordClientCommands.SendCommand,
          handler: this.handleSendCommand,
        },
        {
          command: DiscordClientCommands.StartServer,
          handler: this.handleStartServer,
        },
        {
          command: DiscordClientCommands.PlayerList,
          handler: this.handleListPlayers,
        },
        {
          command: DiscordClientCommands.StopServer,
          handler: this.handleStopServer,
        },
        {
          command: DiscordClientCommands.Status,
          handler: this.handleStatus,
        },
      ]

      const [userCommand, ...args] = message.content
        .replace(/<@![0-9]*>/g, '')
        .trim()
        .split(' ')
        .filter(value => value)

      for (const { command, handler } of handlers) {
        if (userCommand === command) {
          console.log(`Received Discord command: ${command}`)
          handler.call(
            this,
            message.channel as Discord.TextChannel,
            args.join(' '),
          )
        }
      }
    })

    const ready = new Promise<void>(resolve =>
      this.client.once('ready', resolve),
    )
    this.client.login(DISCORD_BOT_TOKEN)

    return ready
  }

  async broadcastMessage(message: string) {
    console.log(
      `Sending command ${message} to ${this.channels.length} channels`,
    )

    await Promise.all(
      this.channels.map(channel => {
        channel.send(message)
      }),
    )
  }

  async setTopic(topic: string) {
    await Promise.all(this.channels.map(channel => channel.setTopic(topic)))
  }

  private canRespondToMessage(message: Discord.Message): boolean {
    return (
      message.channel.type === 'text' &&
      message.channel.name === DISCORD_BOT_CHANNEL &&
      !!message.mentions.members?.find(
        member => member.user.id === this.client.user?.id,
      )
    )
  }

  private handleHelpCommand(channel: Discord.TextChannel) {
    channel.send(`
    Hi I'm Germy's Minecraft server bot. Here are some commands you could use :) :Pog:

    \`!command <command>\` - Run a server command
    \`!help\`              - Prints this message
    \`!list\`              - Get a list of players in the server right now
    \`!start\`             - Starts the server if it's not already running
    \`!status\`            - Gets the server status
    \`!stop\`              - Stops the server if it's not already running
    `)
  }

  private handleSendCommand(channel: Discord.TextChannel, command: string) {
    this.emit(DiscordClientCommands.SendCommand, channel, command)
  }

  private handleStartServer(channel: Discord.TextChannel) {
    this.emit(DiscordClientCommands.StartServer, channel)
  }

  private handleListPlayers(channel: Discord.TextChannel) {
    this.emit(DiscordClientCommands.PlayerList, channel)
  }

  private handleStopServer(channel: Discord.TextChannel) {
    this.emit(DiscordClientCommands.StopServer, channel)
  }

  private handleStatus(channel: Discord.TextChannel) {
    this.emit(DiscordClientCommands.Status, channel)
  }

  private get channels(): Discord.TextChannel[] {
    return this.client.channels.cache
      .array()
      .filter(
        channel =>
          channel instanceof Discord.TextChannel &&
          channel.name === DISCORD_BOT_CHANNEL,
      ) as Discord.TextChannel[]
  }
}
