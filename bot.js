const Discord = require("discord.js");
const client = new Discord.Client();
const Client = require('node-rest-client').Client;
const schedule = require('node-schedule');
const twitch = require('twitch.tv');
const ytdl = require('ytdl-core');
const jsonfile = require('jsonfile');
const restClient = new Client();
const configFile = "config.json";
const ms = require("ms");

const Util = require('discord.js');
const YouTube = require('simple-youtube-api');
const youtube = new YouTube('AIzaSyC0J6jgmsMgmwWoZ9SsX7-QZugwCRhxKRQ');
const queue = new Map();
client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
client.user.setGame(`POBLACION: ${client.users.size}`);	
});
client.on("guildCreate", guild => {
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setGame(`POBLACION: ${client.users.size}`);	
});
client.on("guildDelete", guild => {
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
 client.user.setGame(`POBLACION: ${client.users.size}`);	
});
client.on('guildMemberAdd', member => {
    member.guild.channels.get('219256995574710272').send('**' + member.user.username + '** ahora vive en el bunker! :house:');
member.addRole('352996000572637185');
});
client.on('guildMemberRemove', member => {
    member.guild.channels.get('219256995574710272').send('**' + member.user.username + '** se fue con Arnoldt :hand_splayed: ');
    //
});
const job = schedule.scheduleJob('/1 * * * * *', () => {
    console.log("Job Started.");
    jsonfile.readFile(configFile, (err, config) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log("Config Loaded, checking streams...");
        for (const stream of config.streams) {
            console.log(`Checking Twitch ID ${stream.id}`);
            twitch(`streams/${stream.id}`, config.twitchAuth, (err, twitchResponse) => {
                if (err) {
                    console.log(err);
                    return;
                }
                if (!twitchResponse.stream) {
                    console.log(`Twitch ID ${stream.id} (${stream.nickname}) is not live`);
                    return;
                }
                if (stream.latestStream === twitchResponse.stream._id) {
                    console.log(`Already tracked this stream from Twitch ID ${stream.id} (${stream.nickname})`);
                    return;
                }
                console.log(`Twitch ID ${stream.id} (${stream.nickname}) has started streaming!`);
                stream.latestStream = twitchResponse.stream._id;
                jsonfile.writeFile(configFile, config, (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
                if (!twitchResponse.stream.game) {
                    twitchResponse.stream.game = "Not Playing";
                }
                stream.receivers.forEach((receiver) => {
                    const args = buildWebHook(twitchResponse, receiver);
                    restClient.post(receiver.webhook, args, function (data, webhookResponse) {
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
                    "title": `?? LIVE: ${twitchResponse.stream.channel.status}`,
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
async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    console.log(video);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);
        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`I could not join the voice channel: ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send(`No puedo entrar al canal de voz: ${error}`);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if (playlist)
            return undefined;
        else
            return message.channel.send(`**${song.title}** agregado a la cola!`);
    }
    return undefined;
}
function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    console.log(serverQueue.songs);
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
            .on('end', reason => {
                if (reason === 'Stream is not generating quickly enough.')
                    console.log('Song ended.');
                else
                    console.log(reason);
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Reproduciendo: **${song.title}**`);
}
client.on("message", async message => {
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    const argsM = message.content.split(' ');
    const searchString = argsM.slice(1).join(' ');
    const url = argsM[1] ? argsM[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(message.guild.id);
	
	
    if (message.content.includes("huevo")) {
        message.react(client.emojis.get("430508228976181248"));
    }
	
	
    if (message.content.startsWith("!huevo")){
        message.delete();
        const ayy = client.emojis.get("430508228976181248");
        message.channel.send(`¿y el ${ayy}?`);
    }
	
	
   if (message.content.startsWith("!cmds")){
        if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;
        return message.reply("\n!ping\n!say\n!kick\n!mute @usuario\n!tmute @usuario 1s/m/h/d\n!unmute @usuario\n!ban @usuario\n!nick @usuario nick\n!huevo");
    }
	
	
    if (message.content.startsWith("!nick")){
        if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;
        let member = message.mentions.members.first();
        user = member.user.username;
        let nick = args.slice(1).join(' ');
        member.setNickname(nick);
        message.channel.send(`${user} ahora se llama ${nick}`);
    }
	
	
    if (message.content.startsWith("!ping")){
        const m = await message.channel.send("Ping?");
        m.edit(`Tu ping es de ${m.createdTimestamp - message.createdTimestamp}ms. API ping: ${Math.round(client.ping)}ms`);
    }
	
	
    if (message.content.startsWith("!say")){
        if (!message.member.roles.some(r => ["OWNER", "Admins"].includes(r.name)))
            return 0;
        const sayMessage = args.join(" ");
        message.delete().catch(O_o => {
        });
        message.channel.send(sayMessage);
    }
	
	
    if (message.content.startsWith("!kick")){
        if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;
        let member = message.mentions.members.first();
        if (!member)
            return message.reply("Arrobá al usuario.");
        if (!member.kickable)
            return message.reply("No se pudo kickear al usuario.");
        let reason = args.slice(1).join(' ');
        if (!reason)
            return message.reply("No ingresaste una razón.");
        await member.kick(reason)
                .catch(error => message.reply(`${message.author} no se pudo kickear. Error: ${error}.`));
        message.channel.send(`<@${message.author.id}> kickeó a <@${member.user.id}> por: ${reason}.`);
    }
	
	
   if (message.content.startsWith("!mute")){
        if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;
        let member = message.mentions.members.first();
        if (!member)
            return message.reply("Arrobá al usuario.");
        member.addRole('429091253129576448');
        message.channel.send(`<@${member.user.id}> fue muteado por <@${message.author.id}>.`);
    }
	
	
   if (message.content.startsWith("!unmute")){
        if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;
        let member = message.mentions.members.first();
        if (!member)
            return message.reply("Arrobá al usuario.");
        member.removeRole('429091253129576448');
        message.channel.send(`$<@${message.author.id}> desmuteo a <@${member.user.id}>.`);
    }
	
	
    if (message.content.startsWith("!ban")){
        // Most of this command is identical to kick, except that here we'll only let admins do it.
        // In the real world mods could ban too, but this is just an example, right? ;)
        if (!message.member.roles.some(r => ["OWNER", "Admins"].includes(r.name)))
            return 0;
        let member = message.mentions.members.first();
        if (!member)
            return message.reply("Arrobá al usuario.");
        if (!member.bannable)
            return message.reply("No se pudo banear al usuario.");
        let reason = args.slice(1).join(' ');
        if (!reason)
            return message.reply("No ingresaste una razón.");
        await member.ban(reason)
                .catch(error => message.reply(`${message.author} no se pudo banear. Error: ${error}`));
        message.channel.send(`<@${message.author.id}> le dio ban a <@${member.user.id}> por: ${reason}.`);
	    
	   
	    
    }
	
	
    if (message.content.startsWith("!cc")){
        // Let's delete the command message, so it doesn't interfere with the messages we are going to delete.
        // Now, we want to check if the user has the `bot-commander` role, you can change this to whatever you want.
        if (!message.member.roles.some(r => ["OWNER", "Admins"].includes(r.name)))
            return 0;
        async function purge() {
            message.delete(); // Let's delete the command message, so it doesn't interfere with the messages we are going to delete.
            // Now, we want to check if the user has the `bot-commander` role, you can change this to whatever you want.
            // We want to check if the argument is a number
            if (isNaN(args[0])) {
                // Sends a message to the channel.
                message.channel.send('Pone un número despues del comando.'); //\n means new line.
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
	
	
    if (message.content.startsWith("!play")){
        const voiceChannel = message.member.voiceChannel;
        if (!voiceChannel)
            return message.channel.send('Metete en en canal de voz, crack!');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT')) {
            return message.channel.send('No tengo permisos para entrar a este canal.');
        }
        if (!permissions.has('SPEAK')) {
            return message.channel.send('No tengo permisos para hablar en este canal.');
        }
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send(`? Playlist: **${playlist.title}** ha sido agregado a la cola!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    message.channel.send(`
__**Selecciona el temaiken:**__ \n
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Pone un numero de 1-10.
					`);
                    // eslint-disable-next-line max-depth
                    try {
                        var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                            maxMatches: 1,
                            time: 10000,
                            errors: ['time']
                        });
                    } catch (err) {
                        console.error(err);
                        return message.channel.send('Ingresa un valor valido, busqueda cancelada.');
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return message.channel.send('No hay resultados.');
                }
            }
            return handleVideo(video, message, voiceChannel);
        }
    }
   if (message.content.startsWith("!skip")){
        if (!message.member.voiceChannel)
            return message.channel.send('Ingresa en un canal de voz!');
        if (!serverQueue)
            return message.channel.send('No hay nada reproduciendose.');
        serverQueue.connection.dispatcher.end('Skipea3');
        return undefined;
    }
    if (message.content.startsWith("!stop")){
        if (!message.member.voiceChannel)
            return message.channel.send('Ingresa en un canal de voz!');
        if (!serverQueue)
            return message.channel.send('No hay nada reproduciendose.');
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end('Reproducción detenida.');
        return undefined;
    }
    if (message.content.startsWith("!vol")){
        if (!message.member.voiceChannel)
            return message.channel.send('Ingresa en un canal de voz!');
        if (!serverQueue)
            return message.channel.send('No hay nada reproduciendose.');
        if (!argsM[1])
            return message.channel.send(`Volumen actual: **${serverQueue.volume}**`);
        serverQueue.volume = argsM[1];
        serverQueue.connection.dispatcher.setVolumeLogarithmic(argsM[1] / 5);
        return message.channel.send(`Volumen actual: **${argsM[1]}**`);
    }
    if (message.content.startsWith("!song")){
        if (!serverQueue)
            return message.channel.send('No hay nada reproduciendose.');
        return message.channel.send(`Reproduciendo: **${serverQueue.songs[0].title}**`);
    }
   if (message.content.startsWith("!list")){
        if (!serverQueue)
            return message.channel.send('No hay nada reproduciendose.');
        return message.channel.send(`
__**Lista de reproducción:**__\n
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Now playing:** ${serverQueue.songs[0].title}
		`);
    }
    if (message.content.startsWith("!pause")){
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send('Pausa3!');
        }
        return message.channel.send('No hay nada reproduciendose.');
    }
    if (message.content.startsWith("!resume")){
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send('Resumiending!');
        }
        return message.channel.send('No hay nada reproduciendose.');
    }
	
	
    if (message.content.startsWith("!music")){
        return message.reply("\n!play (nombre) - reproduce o agrega a la lista\n!skip - salta la cancion\n!stop - para la musica\n!vol (1-10) - cambia el volumen\n!song - nombre de la cancion\n!list - muestra la lista de reproduccion\n!pause - pausa la reproduccion\n!resume - reanuda la reproduccion");
    }
	
	
	 if (message.content.startsWith("!role")){
	const sayMessage = args.join(" ");
	var i = message.guild.roles.find("name", sayMessage).id;
 return message.reply(i); 
	 }
	
	
	if (message.content.startsWith("!uptime")){
	 if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;
message.delete();
    var days = client.uptime / 8.64e7 | 0;
  var hrs  = (client.uptime % 8.64e7)/ 3.6e6 | 0;
  var mins = Math.round((client.uptime % 3.6e6) / 6e4);	
message.channel.send(`__**BOT UPTIME:**__ ${days} DIAS ${hrs} HS ${mins} MINS`); 	
	}
	
	
	 if (message.content.startsWith("!rules")){
	message.channel.send(`Reglas: No ser como Faste`); 
	}
	
	
	if (message.content.startsWith("!tmute")){
	
		if (!message.member.roles.some(r => ["OWNER", "Admins","Mod"].includes(r.name)))
            return 0;		
		
		let tomute = message.mentions.members.first();
		let mutetime = args.slice(1).join(' ');
		
		
        if (!tomute)
            return message.reply("Arrobá al usuario.");
		 if(!mutetime) return message.reply("Agrega el tiempo despues de la mención!");
  
		
	 await(tomute.addRole('429091253129576448'));
  message.channel.send(`<@${tomute.id}> fue muteado por ${message.author.username} durante: ${ms(ms(mutetime))}`);

  setTimeout(function(){
    tomute.removeRole('429091253129576448');
    message.channel.send(`<@${tomute.id}> ha sido desmuteado!`);
  }, ms(mutetime));
		
		
	}
	
	
	
	if (message.content.startsWith("!server")){
	let sicon = message.guild.iconURL;
    let serverembed = new Discord.RichEmbed()
    .setDescription("Informacion del Servidor")
    .setColor("#15f153")
    .setThumbnail(sicon)
    .addField("Nombre", message.guild.name)
    .addField("Fecha de Creación", message.guild.createdAt)
    .addField("Fecha de Ingreso", message.member.joinedAt)
    .addField("Cantidad de Miembros", message.guild.memberCount);

    message.channel.send(serverembed);
	}
	
	
});
client.login(process.env.BOT_TOKEN);
