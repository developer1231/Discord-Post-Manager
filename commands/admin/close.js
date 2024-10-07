const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js");
const fs = require("fs");
const n = require("../../config.json");
const { saveTicket, autoSaveTicket } = require("../../helpers/ticket.js");
const { createEmbed, createEmbedFields } = require("../../helpers/embed");
const { execute, getCurrentDateTime } = require("../../database/database");
const { createEntry, updateEntry, getLink, addAttachment, hasPerms, retrieve, addText } = require("../../helpers/airtable.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription(`Close the current channel ticket`),

  async execute(interaction) {
    let hasperms = await hasPerms(interaction.member, n.support_roles);
    if (
      !hasperms && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      const Embed = new EmbedBuilder()
        .setTitle(":x: | Invalid Permissions")
        .setDescription(`To use this command, you must have the required permissions.`)
        .setColor("Red")
        .setFooter({ text: n.footer_name, iconURL: n.footer_icon })
        .setAuthor({ name: n.author_name, iconURL: n.author_icon });

      return interaction.reply({ ephemeral: true, embeds: [Embed] });
    }

    let logChannel = interaction.guild.channels.cache.find(
      (r) => r.name == n.log_channel_name
    );

    let tickets = await execute(
      `SELECT * FROM tickets WHERE channel_id = ?`,
      [interaction.channel.id]
    );
    let air = await execute(`SELECT * FROM airtable WHERE channel_id = ?`, [tickets[0].channel_id])
    let waiter = await hasPerms(interaction.member, n.support_roles);
    if (
      !interaction.member.permissions.has(
        PermissionFlagsBits.Administrator
      ) &&
      !waiter
    ) {
      let errorEmbed = createEmbed(
        "❌ | Error Closing Ticket",
        `Hey ${interaction.member}, unfortunately, you don't have permission to close this ticket. Only support agents can do that.`
      ).setColor(n.color);
      return interaction.reply({ ephemeral: true, embeds: [errorEmbed] });
    }

    await interaction.reply({
      ephemeral: true,
      content: `> :white_check_mark: Successfully initialized the ticket close.`,
    });

    if (tickets[0].moderator) {
      await saveTicket(
        interaction,
        tickets[0].requester,
        tickets[0].moderator,
        tickets[0].inquiry
      );
    }

    await interaction.channel.send({
      content: `<@${tickets[0].requester}>`,
    });

    let toTicket = createEmbed(
      `❌ | Ticket Closed`,
      `${interaction.member} has just closed the ticket. The ticket will be deleted in **1 minute**.`,
      false
    );
    // interaction.channel.permissionOverwrites.edit(tickets[0].requester, {
    //   SendMessages: false, 
    // }, {
    //   reason: 'Closing the ticket - User can no longer write',
    // }).then(() => {
    //   console.log(`Permissions updated for ${tickets[0].requester}`);
    // }).catch(console.error);

    let link = await getLink(interaction.channel.id);
    let button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("Go to Airtable")
        .setURL(link)
    );

    const now = new Date();
    const isoString = now.toISOString();

    await updateEntry(
      interaction.channel.id,
      null,
      "Resolved",
      null,
      isoString,
      null,
      null
    );

    await interaction.channel.send({ embeds: [toTicket] });
    console.log(air[0].id)
    let dataz = await retrieve(`${air[0].id}`);
    console.log(dataz)
    
    const ticketOpenedAt = new Date(dataz["First Response Date"]);
   
    console.log(ticketOpenedAt)
    const ticketClosedAt = new Date();  // Current date
    
    // 1. Convert both dates to Discord.js markdown timestamps
    const openedTimestamp = `<t:${Math.floor(ticketOpenedAt.getTime() / 1000)}:F>`; // Full date/time format
    const closedTimestamp = `<t:${Math.floor(ticketClosedAt.getTime() / 1000)}:F>`;
    
    // 2. Calculate the resolution time (difference between ticketClosedAt and ticketOpenedAt)
    const diffMs = ticketClosedAt - ticketOpenedAt;  // Difference in milliseconds
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));  // Days
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));  // Hours
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));  // Minutes
    
    // 3. Create the resolution time string in D, H, M format
    const resolutionTime = `${diffDays}D ${diffHours}H ${diffMinutes}M`;
 
    let toLogChannel = new EmbedBuilder()
      .setTitle("🎫 | Ticket Closed")
      .setColor(n.color)
      .addFields(
        { name: "Opened By", value: `<@${tickets[0].requester}>`, inline: true },
        {
          name: "Support Agent",
          value: tickets[0].moderator
            ? `<@${tickets[0].moderator}>`
            : "Ticket not claimed",
          inline: true,
        },
        {
          name: "User Inquiry",
          value: `\`\`\`${tickets[0].inquiry.replace(/\n/g, "\n")}\`\`\``,
        }, { 
          name: 'Ticket Opened At', 
          value: `${openedTimestamp}`,
          inline: true 
        },
        { 
          name: 'Ticket Closed At', 
          value: `${closedTimestamp}`, 
          inline: true 
        },
        { 
          name: 'Resolution Time', 
          value: `${resolutionTime}`, 
          inline: true 
        }
      )
      .setTimestamp()
      if(n.footer_name) toLogChannel.setFooter({
        text: n.footer_name,
        iconURL: n.footer_icon,
      });

    let attachmentPath = `./${tickets[0].requester}.html`;
    let attachment;
    let textfile;
    // Check if the ticket has a moderator and prepare the attachment
    if (tickets[0].moderator) {
      attachment = new AttachmentBuilder(attachmentPath, { name: "transcript.html" });
      textfile = new AttachmentBuilder(`./${tickets[0].requester}.txt`, { name: `transcript.txt` });
    }

    // Send the embed to the log channel without the file (optional)
    await logChannel.send({
      embeds: [toLogChannel],
      components: [button],
    });

    // If there is a moderator, upload the file to Discord, get the URL, and upload to Airtable
    if (tickets[0].moderator) {
      let sentMessage = await logChannel.send({ files: [attachment] });
      const attachmentUrl = sentMessage.attachments.first().url;

      // Now upload that URL to Airtable
      await addAttachment(interaction.channel.id, attachmentUrl);
      await addText(interaction.channel.id, `./${tickets[0].requester}.txt`);
      
    
      // Clean up the local file after the upload
      fs.unlink(attachmentPath, (err) => {
        if (err) console.log(err);
      });
      fs.unlink(`./${tickets[0].requester}.txt`, (err) => {
        if (err) console.log(err);
      });

      // Delete the Discord message with the attachment to clean up
      setTimeout(async () => {
        await sentMessage.delete();
      }, 10000);

     
   
    }

    // Additional functionality remains untouched
   
    let message = await execute(`SELECT * FROM tickets WHERE channel_id = ?`, [interaction.channel.id])
    let toUser = createEmbedFields(`🔔 | Ticket Closed`, [
      message[0].message_id,
      tickets[0].requester,
      interaction.member.id,
      tickets[0].moderator,
      `Agent clicked the **Close** button.`,
      getCurrentDateTime(),
    ])
    await interaction.guild.members.fetch();
    let member = interaction.guild.members.cache.find(
      (r) => r.id === tickets[0].requester
    );
    await member.send({ embeds: [toUser] });

    const review = createEmbed(
      "⭐️| Feedback System",
      `Hey ${member}, we'd love to know how we did! Please choose a rating that matches the help you received from our team.`,
      true, true
    )
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("1")
        .setLabel("⭐️1")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("2")
        .setLabel("⭐️2")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("3")
        .setLabel("⭐️3")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("4")
        .setLabel("⭐️4")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("5")
        .setLabel("⭐️5")
        .setStyle(ButtonStyle.Success)
    );
    let r = await member.send({ embeds: [review], components: [actionRow] });
    let data = await execute(`SELECT * FROM temps WHERE channel_id = ?`, [interaction.channel.id])
    if (data.length == 0) {
      await execute(`INSERT INTO temps (channel_id, message_id) VALUES (?, ?)`, [interaction.channel.id, r.id])
    } else {
      await execute(`UPDATE temps set message_id = ? WHERE channel_id = ?`, [r.id, interaction.channel.id])

    }
    
    setTimeout(async () => {
      try {
        await execute(`DELETE FROM tickets WHERE channel_id = ?`, [
          interaction.channel.id,
        ]);
        await interaction.channel.delete();
      } catch (e) {
        console.log(e);
      }
    }, 60000);
  },
};
