import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserContextMenuCommandInteraction,
} from "discord.js";

import * as db from "./database";

export async function handlePay(ix: UserContextMenuCommandInteraction) {
  if (ix.user.id === ix.targetUser.id) {
    await ix.reply({ content: "You can't pay yourself!", ephemeral: true });
    return;
  }

  if (ix.targetUser.bot) {
    await ix.reply({ content: "You can't pay a bot!", ephemeral: true });
    return;
  }

  const modal = new ModalBuilder() //
    .setCustomId(`${ix.id}-modal`)
    .setTitle(`Issuing IOU to @${ix.targetUser.tag}`);

  const amountInput = new TextInputBuilder()
    .setCustomId(`${ix.id}-amountInput`)
    .setLabel("Amount")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(9)
    .setRequired(true)
    .setPlaceholder("5.00");

  const reasonInput = new TextInputBuilder()
    .setCustomId(`${ix.id}-reasonInput`)
    .setLabel("Reason")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder("Tacos!");

  const confirmCode = Math.random().toFixed(6).substring(2);

  const confirmInput = new TextInputBuilder()
    .setCustomId(`${ix.id}-confirmInput`)
    .setLabel(`Type ${confirmCode} to confirm`)
    .setStyle(TextInputStyle.Short)
    .setMinLength(6)
    .setMaxLength(6)
    .setRequired(true)
    .setPlaceholder("Enter the code above.");

  modal.addComponents([
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([amountInput]),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([reasonInput]),
    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([confirmInput]),
  ]);

  await ix.showModal(modal);

  const formSubmit = await ix.awaitModalSubmit({
    time: 1000 * 60 * 60, // 1 hour
    filter: (i) => i.customId === modal.data.custom_id,
  });

  if (!formSubmit) return;

  const amountRaw = formSubmit.fields.getTextInputValue(`${ix.id}-amountInput`);
  const reasonRaw = formSubmit.fields.getTextInputValue(`${ix.id}-reasonInput`);
  const confirmRaw = formSubmit.fields.getTextInputValue(`${ix.id}-confirmInput`);

  // Parse amount
  let amountNum = Number.parseFloat(amountRaw.trim().replace(/^\$/, ""));
  if (!Number.isNaN(amountNum)) amountNum = Math.round((amountNum + Number.EPSILON) * 100) / 100;
  if (Number.isNaN(amountNum) || amountNum <= 0 || amountNum > 1000000) {
    await formSubmit.reply({
      content: "Error: Invalid amount.",
      ephemeral: true,
    });
    return;
  }

  // Check confirmation
  if (confirmRaw.trim() !== confirmCode) {
    await formSubmit.reply({
      content: "Confirmation code did not match.",
      ephemeral: true,
    });
    return;
  }

  // TODO: process payment
  const userFromId = db.getOrCreateUserId(ix.user.id);
  const userToId = db.getOrCreateUserId(ix.targetUser.id);

  const transactionID = db.createTransaction({
    user_from: userFromId,
    user_to: userToId,
    amount: amountNum,
    reason: reasonRaw,
  });

  const embed = new EmbedBuilder()
    .setTitle("Payment Complete")
    .setColor("#3de643")
    .setTimestamp()
    .setDescription("The transaction completed successfully.")
    .addFields(
      { name: "Amount", value: `$${amountNum.toFixed(2)}` },
      { name: "From", value: `${ix.user}` },
      { name: "To", value: `${ix.targetUser}` },
      { name: "Reason", value: reasonRaw }
    )
    .setFooter({ text: `Transaction ID ${transactionID} (${userFromId} --> ${userToId})` });

  await formSubmit.reply({ content: `${ix.targetUser}`, embeds: [embed] });
}

function formatBalance(balance: number): string {
  return "```diff\n" + (balance >= 0 ? "+" : "-") + " $" + Math.abs(balance).toFixed(2) + "\n```";
}

export async function handleViewBalances(ix: UserContextMenuCommandInteraction) {
  const userFromId = db.getOrCreateUserId(ix.user.id);
  const userToId = db.getOrCreateUserId(ix.targetUser.id);

  const balance = db.getBalance(userFromId, userToId);

  const embed = new EmbedBuilder()
    .setTitle("Balance Between Users")
    .setColor("#3de643")
    .setTimestamp()
    .setDescription(`${ix.user}:\n${formatBalance(balance.from)}\n${ix.targetUser}:\n${formatBalance(balance.to)}`);

  await ix.reply({ content: `Balance between ${ix.user} and ${ix.targetUser}:`, embeds: [embed] });
}

export async function handleBalance(ix: ChatInputCommandInteraction) {
  const userId = db.getOrCreateUserId(ix.user.id);

  const balance = db.getTotalBalance(userId);

  const embed = new EmbedBuilder()
    .setTitle("Your Balance")
    .setColor("#3de643")
    .setTimestamp()
    .setDescription(`${ix.user}:\n${formatBalance(balance)}`);

  await ix.reply({ embeds: [embed], ephemeral: true });
}
