# Minecraft Server Bot

A simple Discord bot for managing a Minecraft server through Discord. Written
in TypeScript and powered by [Discord.js](https://discord.js.org/#/).

## How Does it Work?

The server runs the Minecraft vanilla server as a child process.The Node.js
server also monitors stdin to determine when the server starts/stops and when
players joins/leaves. The server also has RCON enabled, allowing Discord
users to send commands in a message.

## Features

- Written entirely in TypeScript 💪
- Wrapper over vanilla Minecraft server 🍨
- Discord commands for starting the server, stopping the server, sending RCON commands, etc. ⚡
- Orechestrated with docker-compose 🕙
- Built with ❤️

## Setup

1. [Setup a Discord Bot](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)
2. [Add the bot to your server](https://discordjs.guide/preparations/adding-your-bot-to-servers.html)
3. Using `.env.example`, create a `.env` file
   - Change `HOST` to your server hostname
   - Change `DISCORD_BOT_TOKEN` to your bot token from step (2)
4. Run `yarn` to install dependencies and `yarn build` to build the server
5. Download [Minecraft: Java Edition Server](https://www.minecraft.net/en-us/download/server) and
   - Rename the downloaded file to `server.jar`
   - **Or** update `SERVER_JAR_FILE` in `.env` to point to a jar file
6. Run `echo eula=true` > `eula.txt` to agree to Minecraft's EULA
7. Run `docker-compose up -d` to run the Minecraft server and Discord bot

![](images/screenshot.png)
