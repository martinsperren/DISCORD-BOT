
// Load up the discord.js library
const Discord = require("discord.js");
const client = new Discord.Client();
const stream = require('youtube-audio-stream')
const ytdl = require('ytdl-core');
const YTSearcher = require('ytsearcher');
const ypi = require('youtube-playlist-info');



// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.


// Here we load the config.json file that contains our token and our prefix values. 

// config.token contains the bot's token
// config.prefix contains the message prefix.

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});


client.on('guildMemberAdd', member => {
    member.guild.channels.get('219256995574710272').send('**' + member.user.username + '**, ahora vive en el bunker!'); 
});

client.on('guildMemberRemove', member => {
    member.guild.channels.get('219256995574710272').send('**' + member.user.username + '**, se fue con Arnoldt.');
    //
});




client.on("message", async message => {
 
  const args = message.content.slice("!".length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
  // Let's go with a few common example commands! Feel free to delete or change those.
  
    if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  
  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    message.channel.send(sayMessage);
  }
  
  if(command === "kick") {
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit: 
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return message.reply("No la tenes lo suficientemente larga para usar este comando");
  
    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Arrobá al petardo");
    if(!member.kickable) 
      return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");
    
    // slice(1) removes the first part, which here should be the user mention!
    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Agrega despues del nombre del petardo la razon por la que se va deleteado");
    
    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author} no lo puedo patear porque : ${error}`));
    message.reply(`${message.author.username} rajo a la mierda a ${member.user.username} por: ${reason}`);

  }
  
    if(command === "mute") {
  if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return message.reply("No la tenes lo suficientemente larga para usar este comando");
  let member = message.mentions.members.first();
      if(!member)
      return message.reply("Arrobá al petardo");
     
      
member.addRole('429091253129576448');
     
      message.reply(`${member.user.username} se comio un mute de ${message.author.username}`);
      
  
     }
  
  
  if(command === "unmute") {
  if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return message.reply("No la tenes lo suficientemente larga para usar este comando");
  let member = message.mentions.members.first();
      if(!member)
      return message.reply("Arrobá al petardo");
   
    
member.removeRole('429091253129576448');
      message.reply(`${message.author.username} desmuteo a ${member.user.username}`);
      
  
     }
  
  if(command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.roles.some(r=>["OWNER","Admins"].includes(r.name)) )
      return message.reply("No la tenes lo suficientemente larga para usar este comando");
    
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Arroba al petardo");
    if(!member.bannable) 
      return message.reply("Se rompio algo y no pude banear al petardo");

    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Agrega despues del nombre del petardo la razon por la que se va deleteado");
    
    await member.ban(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
    message.reply(`${member.user.username} le metio alto ban a ${message.author.username} por: ${reason}`);
  }
  
  if(command === "cc") {
    // This command removes all messages from all users in the channel, up to 100.
    
    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    
    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 1 || deleteCount > 100)
      return message.reply("Pone un numero del 1 al 100 despues del comando maquina");
    
    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({count: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`No pude borrar un carajo porque: ${error}`));
  }
  
 if(command === "music") {
 
 }
  
  
  
   
     
});


client.login(process.env.BOT_TOKEN);
