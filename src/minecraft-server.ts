import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { EventEmitter } from 'events'
import mc from 'minecraft-server-util'
import { RCON } from 'minecraft-server-util/dist/structure/RCON'

const {
  JAVA_MAX_MEMORY,
  JAVA_MIN_MEMORY,
  RCON_PASSWORD,
  SERVER_JAR_FILE,
} = process.env

export enum MinecraftServerEvents {
  Close = 'close',
  Error = 'error',
  PlayerJoined = 'player-joined',
  PlayerLeft = 'player-left',
}

export interface PlayerListDetails {
  count: number
  max: number
  players: string[]
}

export class MinecraftServer extends EventEmitter {
  isSendingRCONCommand = false

  private rconClient?: RCON
  private serverProcess?: ChildProcessWithoutNullStreams

  private serverStartPromise?: Promise<void>
  private resolveServerStart?: () => void

  private serverStopPromise?: Promise<void>
  private resolveServerStop?: () => void

  async start() {
    this.serverStartPromise = new Promise(resolve => {
      this.resolveServerStart = resolve
    })

    this.serverProcess = spawn('java', [
      `-Xmx${JAVA_MAX_MEMORY}`,
      `-Xms${JAVA_MIN_MEMORY}`,
      '-jar',
      SERVER_JAR_FILE as string,
      '--nogui',
    ])

    this.serverProcess.stdout.on('data', this.handleMessage.bind(this))
    this.serverProcess.stderr.on('error', this.handleError.bind(this))
    this.serverProcess.on('close', this.handleProcessClose.bind(this))
    this.serverProcess.on('error', this.handleProcessError.bind(this))

    return this.serverStartPromise
  }

  async stop() {
    this.serverStopPromise = new Promise<void>(resolve => {
      this.resolveServerStop = resolve
    })

    await this.sendRCONCommand('stop')
    await this.rconClient?.close()

    return this.serverStopPromise
  }

  async sendRCONCommand(command: string): Promise<string> {
    if (!this.rconClient && !this.isSendingRCONCommand) return ''

    this.isSendingRCONCommand = true

    return new Promise(async resolve => {
      this.rconClient?.once('output', (data: string) => {
        this.isSendingRCONCommand = false
        resolve(data)
      })

      await this.rconClient?.run(command)
    })
  }

  async fetchPlayerList(): Promise<PlayerListDetails> {
    const response = await this.sendRCONCommand('list')
    const match = /There are ([0-9]*) of a max of ([0-9]*) players online: (.*)/.exec(
      response,
    )

    return {
      count: +(match?.[1] ?? 0),
      max: +(match?.[2] ?? 0),
      players: match?.[3]?.split(' ')?.filter(value => value) ?? [],
    }
  }

  async fetchPlayerCount(): Promise<number> {
    const status = await mc.status('localhost')
    return status.onlinePlayers ?? 0
  }

  private async connectRCON() {
    try {
      this.rconClient = new mc.RCON('localhost', { password: RCON_PASSWORD })

      await this.rconClient.connect()
    } catch (err) {
      console.error('Error connecting to RCON:', err)
    }
  }

  private async handleServerStarted(duration: string) {
    console.log(`server started in ${duration}`)

    await this.connectRCON()

    this.resolveServerStart?.()

    this.serverStartPromise = undefined
    this.resolveServerStart = undefined
  }

  private async handlePlayerJoins(username: string) {
    console.log(`${username} joined the game :)`)
    this.emit(MinecraftServerEvents.PlayerJoined, username)
  }

  private async handlePlayerLeaves(username: string) {
    console.log(`${username} left the game :(`)
    this.emit(MinecraftServerEvents.PlayerLeft, username)
  }

  async handleMessage(data: Buffer) {
    const message = data.toString()
    console.log('Received data:', message)

    const handlers: Array<{
      regex: RegExp
      handler: (...args: any[]) => void
    }> = [
      {
        regex: /Done \((.*)\)! For help, type "help"/,
        handler: this.handleServerStarted,
      },
      {
        regex: /(\S*) joined the game/,
        handler: this.handlePlayerJoins,
      },
      {
        regex: /(\S*) left the game/,
        handler: this.handlePlayerLeaves,
      },
    ]

    for (const { regex, handler } of handlers) {
      const match = regex.exec(message)
      if (match) {
        handler.apply(this, match.slice(1))
      }
    }
  }

  private handleProcessError(err: Error) {
    console.log('Error starting Minecraft server:', err.message)
    this.emit(MinecraftServerEvents.Error, err.message)
  }

  private handleError(data: Buffer) {
    const err = data.toString()
    console.log('Minecraft server error:', err)
    this.emit(MinecraftServerEvents.Error, err)
  }

  private handleProcessClose(code: number) {
    this.emit(MinecraftServerEvents.Close, code)
    console.log('Server closed with code:', code)
    this.resolveServerStop?.()

    this.serverStopPromise = undefined
    this.resolveServerStop = undefined
  }
}
