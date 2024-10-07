const fs = require("fs");
const config = require("../config.json");
const {
  Events,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActivityType,
  Status,
} = require("discord.js");
const { createEmbed } = require("../helpers/embed.js");
const { Initialization, execute } = require("../database/database");
const { autoSaveTicket } = require("../helpers/ticket.js");
const {
  updateEntry,
  addAttachment,
  getLink,
  addText,
} = require("../helpers/airtable.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    let config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    client.user.setPresence({
      activities: [{ name: `Tickets`, type: ActivityType.Watching }],
      status: "dnd",
    });
    await Initialization();
    client.guilds.cache.forEach(async (guild) => {
      if (config.channel && config.sequence == 0) {
        let channel = guild.channels.cache.find((r) => r.id === config.channel);
        let role = guild.roles.cache.find((r) => r.id === config.role);
        if (!channel) return;
        config.sequence++;
        fs.writeFileSync("./config.json", JSON.stringify(config), (err) => {
          if (err) console.log(err);
        });
        let button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Check Time")
            .setCustomId("check_time")
            .setStyle(ButtonStyle.Primary)
        );
        let toLogChannel = new EmbedBuilder()
          .setTitle("⚠️ | Posting Rules")
          .setDescription(
            `> Dear member, interested in posting your music to ${channel}?\n\n> This message is here to help you out with that!\n\n> - Before you are able to post, you must understand a few things:\n\n> - You can only post **one** message every 4 months. If you don't adhere to this rule, your posting will automatically get deleted.\n> - You can only post messages if you have the ${role} role.\n\n> ### Button Information\n> You can use the **Check Time** button below to check whether you have already posted once in these 4 months. `
          )
          .setColor(config.color)
          .setTimestamp();

        await channel.send({
          embeds: [toLogChannel],
          components: [button],
        });
      }
    });
  },
};
