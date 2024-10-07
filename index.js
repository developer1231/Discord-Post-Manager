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
  let config = JSON.parse(fs.readFileSync("./config.json", "utf8"))
  let channel = message.guild.channels.cache.find(r => r.id === config.channel)
  let role = message.guild.roles.cache.find(r => r.id === config.role)
  if (message.author.bot) {
    return;
  }
  if(message.channel.id !== channel.id) return;
  if(message.member.permissions.cache.has(PermissionFlagsBits.Administrator)) return;
  let data = await execute(`SELECT * FROM posts WHERE member_id = ?`, [message.member.id]);
  const currentTimestamp = Date.now()
  if(!message.member.roles.cache.some(r => r.id == role.id)){
    let toMember = new EmbedBuilder()
    .setTitle(":x: | Invalid Permissions")
    .setAuthor({name: `${message.member.user.username}`, iconURL: `${message.member.user.displayAvatarURL()}`})
    .setDescription(
      `> Dear ${message.member}, \n\n> Recently you have tried posting in the ${message.channel} channel, however you don't have the required role, ${role}, to do so.\n\n> Please, head over to the admins and request permissions to receive this role.`
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
   
    await execute(`UPDATE posts SET timestamp = ?, SET message_id = ? WHERE member_id = ?`, [currentTimestamp, message.id, message.member.id]);
    } else{
      let oldMessage = await channel.messages.fetch(data[0].message_id)
      let toMember = new EmbedBuilder()
      .setTitle(":x: | You're posting too soon!")
      .setAuthor({name: `${message.member.user.username}`, iconURL: `${message.member.user.displayAvatarURL()}`})
      .setDescription(
        `> Dear ${message.member}, \n\n> Recently you have tried posting in the ${message.channel} channel, however you already have been administered posting less than **4 Months** ago. Please, go to the ${channel} channel, and view how much time you got left before you can post again.\n> To view the message you had previously posted, please [Click Here]('${oldMessage}')`
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
 
  
});

client.login(process.env.DISCORD_BOT_TOKEN);