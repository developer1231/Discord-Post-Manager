require('dotenv').config();
const fs = require("node:fs");
const path = require("node:path");
const n = require("./config.json");
const { execute, getCurrentDateTim, isMoreThanFourMonthsAgo } = require("./database/database");
const {
  REST,
  Routes,
  ChannelType,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  Embed,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ThreadAutoArchiveDuration,
} = require("discord.js");
const {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  Collection,
  EmbedBuilder,
} = require("discord.js");
const client = new Client({
  intents: Object.keys(GatewayIntentBits).map((a) => {
    return GatewayIntentBits[a];
  }),
});

const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);
client.commands = new Collection();
for (const folder of commandFolders) {
  if (fs.lstatSync("./commands/" + folder).isDirectory()) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );
    const data = await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) {
    return;
  }
  let config = JSON.parse(fs.readFileSync("./config.json", "utf8"))
  let channel = await message.guild.channels.cache.find(r => r.id == config.post_channel)
  let role = message.guild.roles.cache.find(r => r.id === config.role)
  
  if(message.channel.id !== channel.id) return;
  if(message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
  let data = await execute(`SELECT * FROM posts WHERE member_id = ?`, [message.member.id]);
  const currentTimestamp = Date.now()
  if(!message.member.roles.cache.some(r => r.id == role.id)){
    let toMember = new EmbedBuilder()
    .setTitle(":x: | Invalid Permissions")
    .setThumbnail(message.guild.iconURL())
    .setAuthor({name: `${message.member.user.username}`, iconURL: `${message.member.displayAvatarURL()}`})
    .setDescription(
      `> Dear ${message.member}, \n\n> Recently you have tried posting in the ${message.channel} channel, however you don't have the required role to do so.\n\n> Please, head over to the admins and request permissions to receive this role.`
    )
    .setColor("Red")
    .setTimestamp();
    try {
      await message.member.send({
        embeds: [toMember],
      });
      } catch (error) {
        console.log(`Couldn't DM the member as their discord DM's are disabled.`);
      }
      await message.delete()
      return;
  }
  if(data.length > 0){
   
    if(isMoreThanFourMonthsAgo(data[0].timestamp)){
    await execute(`UPDATE posts SET timestamp = ?, message_id = ? WHERE member_id = ?`, [currentTimestamp, message.id, message.member.id]);
    } else{
      console.log("data")
      let oldMessage = await channel.messages.fetch(data[0].message_id)
      console.log(oldMessage)
      let toMember = new EmbedBuilder()
      .setTitle(":x: | You're posting too soon!")
      .setThumbnail(message.guild.iconURL())
      .setAuthor({name: `${message.member.user.username}`, iconURL: `${message.member.displayAvatarURL()}`})
      .setDescription(
        `> Dear ${message.member}, \n\n> Recently you have tried posting in the ${message.channel} channel, however you already have been administered posting less than **4 Months** ago. Please, go to the ${channel} channel, and view how much time you got left before you can post again.\n> To view the message you had previously posted, please [Click Here](${oldMessage.url})`
      )
      .setColor("Red")
      .setTimestamp();
      try {
        await message.member.send({
          embeds: [toMember],
        });
        return await message.delete()
        } catch (error) {
          console.log(`Couldn't DM the member as their discord DM's are disabled.`);
        }
    }
  }else{
  
    await execute(`INSERT INTO posts (member_id, timestamp, message_id) VALUES (?, ?, ?)`, [message.member.id, currentTimestamp, message.id]);
    
  }

   
  
  
  // `create table if not exists posts (
  //   member_id PRIMARY KEY TEXT,
  //   timestamp TIMESTAMP NOT NULL,
  //   message_id TEXT NOT NULL
  //   )`)
  
});

client.on(Events.InteractionCreate, async (interaction) => {
  let command = client.commands.get(interaction.commandName);
  if (interaction.isCommand()) {
    command.execute(interaction);
  }
 if(interaction.isButton()){
  if(interaction.customId === "check_time"){
    let post_channel = interaction.guild.channels.cache.find(r => r.id === n.post_channel)
    let data = await execute(`SELECT * FROM posts WHERE member_id = ?`, [interaction.member.id])
    if(data.length === 0){
      let toMember = new EmbedBuilder()
      .setTitle(":x: | Invalid Data")
      .setThumbnail(interaction.guild.iconURL())
      
      .setAuthor({name: `${interaction.member.user.username}`, iconURL: `${interaction.member.displayAvatarURL()}`})
      .setDescription(
        `> Dear ${interaction.member},\n\n> It seems like you have not yet made a post. Please, head over to ${post_channel} and publish your first post to the world!`
      )
      .setColor("Red")
      .setTimestamp();
    await interaction.reply({ephemeral:true, embeds: [toMember]})
    return;
    }
    console.log(isMoreThanFourMonthsAgo(data[0].timestamp))
    if(isMoreThanFourMonthsAgo(data[0].timestamp)){
      let toMember = new EmbedBuilder()
      .setTitle(":white_check_mark: | Feel free to post!")
      .setThumbnail(interaction.guild.iconURL())
      .setAuthor({name: `${interaction.member.user.username}`, iconURL: `${interaction.member.displayAvatarURL()}`})
      .setDescription(
        `> Dear ${interaction.member},\n\n> The last post you have created was more than **4 months ago**. Please, feel free to post again in the ${post_channel} channel! Good luck!`
      )
      .setColor("Red")
      .setTimestamp();
    await interaction.reply({ephemeral:true, embeds: [toMember]})
    return
    }else{
      let timeInMilliseconds = data[0].timestamp; // or Math.floor(data[0].timestamp / 1000) * 1000 if it’s in seconds
let date = new Date(timeInMilliseconds);

// Add 4 months
date.setMonth(date.getMonth() + 4);

// Get the new timestamp in milliseconds
let newTimeInMilliseconds = date.getTime();
console.log(newTimeInMilliseconds)
console.log(data[0].timestamp)
      let dater = `<t:${Math.round(newTimeInMilliseconds / 1000)}:F>`
      let toMember = new EmbedBuilder()
      .setTitle(":x: | You cannot post yet!")
      .setThumbnail(interaction.guild.iconURL())
      .setAuthor({name: `${interaction.member.user.username}`, iconURL: `${interaction.member.displayAvatarURL()}`})
      .setDescription(
        `> Dear ${interaction.member},\n\n> The last post you have created was less than **4 months ago**. You are able to post again at: ${dater}.\n\n> All your posts before this date will automatically be removed.`
      )
      .setColor("Red")
      .setTimestamp();
    await interaction.reply({ephemeral:true, embeds: [toMember]})
    return
    }
  }
 }
  
});

client.login(process.env.DISCORD_BOT_TOKEN);