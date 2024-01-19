#!/usr/bin/env bun

import { Client } from "discord.js";

import * as dotenv from "dotenv";
import { handlePay, handleViewBalances, handleBalance } from "./commands";

dotenv.config();

const bot = new Client({
  intents: [],
});

bot.on("interactionCreate", async (ix) => {
  if (ix.isUserContextMenuCommand()) {
    const normalizedName = ix.commandName.toLowerCase().replace(/[\s-]+/g, "-");

    if (normalizedName == "issue-iou-with-tabbypay") {
      await handlePay(ix);
    } else if (normalizedName == "view-tabby-balances") {
      await handleViewBalances(ix);
    }
  } else if (ix.isChatInputCommand()) {
    if (ix.commandName == "balance") {
      await handleBalance(ix);
    }
  }
});

await bot.login();
console.log(`Logged in as ${bot.user!.username}!`);
