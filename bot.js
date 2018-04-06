const Discord = require("discord.js");
const client = new Discord.Client();
const Client = require('node-rest-client').Client;
const stream = require('youtube-audio-stream')
const ytdl = require('ytdl-core');
const YTSearcher = require('ytsearcher');
const ypi = require('youtube-playlist-info');
const schedule = require('node-schedule');
const twitch = require('twitch.tv');
const jsonfile = require('jsonfile');
const restClient = new Client();
const configFile = "config.json";
client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  client.user.setGame(`on ${client.guilds.size} servers`);
});
client.on("guildCreate", guild => {
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});
client.on("guildDelete", guild => {
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});
client.on('guildMemberAdd', member => {
    member.guild.channels.get('219256995574710272').send('**' + member.user.username + '**, ahora vive en el bunker! :house:'); 
	//member.addRole('193654001089118208');
});
client.on('guildMemberRemove', member => {
    member.guild.channels.get('219256995574710272').send('**' + member.user.username + '**, se fue con Arnoldt :hand_splayed: ');
    //
});
const job = schedule.scheduleJob('/1 * * * * *', () => {
	console.log("Job Started.");
	jsonfile.readFile(configFile, (err, config) => {
		if(err){
			console.log(err);
			return;
		}
		console.log("Config Loaded, checking streams...");
		for(const stream of config.streams) {
			console.log(`Checking Twitch ID ${stream.id}`);
			twitch(`streams/${stream.id}`, config.twitchAuth, (err, twitchResponse) =>{
				if(err){
					console.log(err);
					return;
				}
				if (!twitchResponse.stream) {
					console.log(`Twitch ID ${stream.id} (${stream.nickname}) is not live`);
					return;
				}
				if(stream.latestStream === twitchResponse.stream._id) {
					console.log(`Already tracked this stream from Twitch ID ${stream.id} (${stream.nickname})`);
					return;
				}
				console.log(`Twitch ID ${stream.id} (${stream.nickname}) has started streaming!`);
				stream.latestStream = twitchResponse.stream._id;
				jsonfile.writeFile(configFile, config, (err) => {if(err){console.log(err);}});
				if(!twitchResponse.stream.game){
					twitchResponse.stream.game = "Not Playing";
				}
				stream.receivers.forEach((receiver) => {
					const args = buildWebHook(twitchResponse, receiver);
					restClient.post(receiver.webhook, args, function(data, webhookResponse) {
						console.log(`Sent webhook to ${receiver.nickname}`);
					});
				});
			});
		}
	});
});
function buildWebHook(twitchResponse, receiver) {
	return {
		data: {
			"username": `${twitchResponse.stream.channel.display_name}`,
			"avatar_url": `${twitchResponse.stream.channel.logo}`,
			"content": `${receiver.customMessage}`,
			"embeds": [{
				"author": {
					"name": `${twitchResponse.stream.channel.display_name}`,
					"icon_url": `${twitchResponse.stream.channel.logo}`
				},
				"title": `🔴 LIVE: ${twitchResponse.stream.channel.status}`,
				"url": `${twitchResponse.stream.channel.url}`,
				"color": 6570404,
				"fields": [{
					"name": "Game",
					"value": `${twitchResponse.stream.game}`,
					"inline": true
				},
					{
						"name": "Viewers",
						"value": `${twitchResponse.stream.viewers}`,
						"inline": true
					}
				],
				"image": {
					"url": `${twitchResponse.stream.preview.large}`
				},
				"thumbnail": {
					"url": `${twitchResponse.stream.channel.logo}`
				},
				"footer": {
					"text": `/${twitchResponse.stream.channel.name}`,
					"icon_url": `https://cdn.discordapp.com/attachments/250501026958934020/313483431088619520/GlitchBadge_Purple_256px.png`
				}
			}]
		},
		headers: {
			"Content-Type": "application/json"
		}
	};
}
client.on("message", async message => {
  const args = message.content.slice("!".length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
      	if(message.content.includes("huevo")) {
  message.react(client.emojis.get("430508228976181248"));
	}
	  if(command === "huevo") {
   message.delete();
	const ayy = client.emojis.get("430508228976181248");
		message.channel.send(`¿y el ${ayy}?`);  
  }
	 if(command === "cmds") {
		   if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return 0;
     return message.reply("\n!ping\n!say\n!kick\n!mute\n!unmute\n!ban\n!nick\n!huevo");
  }
	if(command === "nick") {
		if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return 0;
	let member = message.mentions.members.first();
	user = member.user.username;
	let nick = args.slice(1).join(' ');
	member.setNickname(nick);
	message.channel.send(`${user} ahora se llama ${nick}`);
 }
    if(command === "ping") {
    const m = await message.channel.send("Ping?");
    m.edit(`Tu ping es de ${m.createdTimestamp - message.createdTimestamp}ms. API ping: ${Math.round(client.ping)}ms`);
  }
  if(command === "say") {
	    if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return 0;
    const sayMessage = args.join(" ");
    message.delete().catch(O_o=>{}); 
    message.channel.send(sayMessage);
  }
  if(command === "kick") {
    if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
       return 0;
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Arrobá al petardo");
    if(!member.kickable) 
      return message.reply("Se rompio algo y no pude banear al petardo");
    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Agrega despues del nombre del petardo la razon por la que se va deleteado");
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author} no lo puedo patear porque : ${error}`));
    message.channel.send(`${message.author.username} rajo a la mierda a ${member.user.username} por: ${reason}`);
  }
    if(command === "mute") {
  if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
      return 0;
  let member = message.mentions.members.first();
      if(!member)
      return message.reply("Arrobá al petardo");
member.addRole('429091253129576448');
      message.channel.send(`${member.user.username} se comio un mute de ${message.author.username}`);
     }
  if(command === "unmute") {
  if(!message.member.roles.some(r=>["OWNER", "Admins"].includes(r.name)) )
     return 0;
  let member = message.mentions.members.first();
      if(!member)
      return message.reply("Arrobá al petardo");
member.removeRole('429091253129576448');
      message.channel.send(`${message.author.username} desmuteo a ${member.user.username}`);
     }
  if(command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.roles.some(r=>["OWNER","Admins"].includes(r.name)) )
       return 0;
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
   message.channel.send(`${member.user.username} deleteó a ${message.author.username} por: ${reason}`);
  }
  if(command === "cc") {
             // Let's delete the command message, so it doesn't interfere with the messages we are going to delete.
            // Now, we want to check if the user has the `bot-commander` role, you can change this to whatever you want.
           if(!message.member.roles.some(r=>["OWNER","Admins"].includes(r.name)) )
       return 0;
           async function purge() {
            message.delete(); // Let's delete the command message, so it doesn't interfere with the messages we are going to delete.
            // Now, we want to check if the user has the `bot-commander` role, you can change this to whatever you want.
            // We want to check if the argument is a number
            if (isNaN(args[0])) {
                // Sends a message to the channel.
                message.channel.send('Pone un numero despues del comando'); //\n means new line.
                // Cancels out of the script, so the rest doesn't run.
                return;
            }
            const fetched = await message.channel.fetchMessages({limit: args[0]}); // This grabs the last number(args) of messages in the channel.
            console.log(fetched.size + ' messages found, deleting...'); // Lets post into console how many messages we are deleting
            // Deleting the messages
            message.channel.bulkDelete(fetched);
        }
        // We want to make sure we call the function whenever the purge command is run.
        purge(); // Make sure this is inside the if(msg.startsWith)
        // We want to make sure we call the function whenever the purge command is run.
  }
  if(command === "play") {	
    const voiceChannel = message.member.voiceChannel;	
       if (!voiceChannel) {	
            return message.reply('please join a voice channel first!');	
        }	
        voiceChannel.join().then(connection => {	
            const stream = ytdl('https://www.youtube.com/watch?v=D57Y1PruTlw', { filter: 'audioonly' });	
            const dispatcher = connection.playStream(stream);	
            dispatcher.on('end', () => voiceChannel.leave());	
        });	
	message.channel.send("OK"); 	
 }
});
client.login(process.env.BOT_TOKEN);
