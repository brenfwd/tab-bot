#!/usr/bin/env bun

import { ApplicationCommandType, REST, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const CLIENT_ID = process.env.CLIENT_ID!;

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
  {
    type: ApplicationCommandType.User,
    name: "Pay",
  },
  {
    type: ApplicationCommandType.User,
    name: "View Balances",
  },
  {
    type: ApplicationCommandType.ChatInput,
    name: "balance",
    description: "View your total balance.",
  },
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

try {
  console.log("Started refreshing application commands.");

  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log("Successfully reloaded application commands.");
} catch (error) {
  console.error(error);
}
