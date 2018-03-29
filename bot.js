const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
});

client.on('message', message => {
    if (message.content === 'ping') {
         const m = await message.channel.send("Ping?");
    	message.reply(
    `Tu Ping es de ${m.createdTimestamp - message.createdTimestamp}ms. el ping de la API es ${Math.round(client.ping)}ms`);
  	}
});

// THIS  MUST  BE  THIS  WAY
client.login(process.env.BOT_TOKEN);
