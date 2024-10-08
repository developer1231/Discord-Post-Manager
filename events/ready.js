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
const { Initialization, execute } = require("../database/database");

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
      console.log(config.channel)
      if (config.channel && config.sequence == 0) {
        let post_channel =  guild.channels.cache.find((r) => r.id === config.post_channel);
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
            .setStyle(ButtonStyle.Danger)
        );
        let toLogChannel = new EmbedBuilder()
          .setTitle("⚠️ | Posting Rules")
          .setAuthor({name: client.user.username, iconURL: client.user.displayAvatarURL()})
          .setImage("https://w0.peakpx.com/wallpaper/570/862/HD-wallpaper-fire-music-note-red-fire-dark-music-new-note.jpg")
          .setDescription(
            `> Dear member, interested in posting your music to ${post_channel}?\n> This message is here to help you with that!\n> Before you are able to post, you must understand a few things:\n\n> - You can only post **one** message every 4 months. If you don't adhere to this rule, your posting will automatically get deleted.\n> - You can only post messages if you have the ${role} role.\n\n> ### Button Information\n> You can use the **Check Time** button below to check whether you have already posted once in these 4 months. `
          )
          .setColor("Red")
          .setTimestamp();

        await channel.send({
          embeds: [toLogChannel],
          components: [button],
        });
      }
    });
  },
};
