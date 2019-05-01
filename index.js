const Discord = require("discord.js");
var fortune = require("fortune-teller");

// Config file
const config = require("./config.json");
// Passwords file
const pw = require("./pw.json");
// Usage strings
const usage = require("./usage.js");

// Modules
const gets = require("./gets");
const post = require("./post");
const twitter = require("./twitter");
const users = require("./users");
const discord = require("./discord");
const commands = require("./commands");

handleCommand = (commandName, author, channel, args) => {
  const command = commands[commandName];
  // Check that the command exists
  if (command) {
    // Check that there's the right number of args
    if (args.length < command.minArgs) {
      post.message(channel, usage[commandName]);
      return;
    }
    let validChecks = 0;
    let isValid = true;
    if (command.checks.length > 0)
      command.checks.forEach(({ f, badB }) => {
        // Check every condition to perform the command
        f(author, channel, passed => {
          // It's already marked as invalid
          if (!isValid) return;
          if (passed) validChecks++;
          else {
            isValid = false;
            if (badB) post.message(channel, badB); // If it's not met and we were given a bad boy, post it
            return;
          }
          if (validChecks === command.checks.length) {
            // If we get here, everything has succeeded.
            command.function(args, channel);
          }
        });
      });
    else command.function(args, channel);
  }
};

discord.onMessage(message => {
  // Ignore bots
  if (message.author.bot) return;

  if (message.content.indexOf(config.prefix) !== 0) {
    if (
      !!message.mentions &&
      !!message.mentions.members &&
      message.mentions.members.find(item => item.user.id === discord.user().id)
    ) {
      message.reply(fortune.fortune());
    } else if (message.channel.type == "dm")
      post.message(
        message.channel,
        "Hello, I'm " +
          config.botName +
          "! Type " +
          config.prefix +
          "help to see a list of my commands! ❤"
      );
    return;
  }
  let args = message.content
    .slice(config.prefix.length)
    .trim()
    .split(/ +/g);
  let command = args.shift().toLowerCase();

  if (command === "help" || command === "?") {
    const embed = new Discord.RichEmbed()
      .setColor(0xd667cf)
      .setTitle(config.botName)
      .setURL(config.githubURL)
      .setDescription(
        `Hello, I am ${
          config.botName
        }, I'm a very simple bot who cross-posts twitter posts to Discord channels!\nWant to invite me to your server? [Click here](https://discordapp.com/oauth2/authorize?client_id=433615162394804224&scope=bot&permissions=0)!\nHere's a list of what I can do:`
      )
      .setFooter(
        "*: Anyone can perform these commands. Issues, suggestions? My creator is Tom'#4242"
      )
      .addField(`${config.prefix}tweet*`, usage["tweet"])
      .addField(`${config.prefix}start`, usage["start"])
      .addField(`${config.prefix}stop`, usage["stop"])
      .addField(`${config.prefix}list*`, usage["list"])
      .addField(`${config.prefix}help*`, "Print this help message.");
    post.embed(message.channel, { embed }, false);
    return;
  }

  const { author, channel } = message;
  handleCommand(command, author, channel, args);
});

discord.onError(error => {
  console.error(new Date() + ": Discord client encountered an error");
});

discord.onGuildCreate(guild => {
  // Message the guild owner with useful information
  guild.owner.send(
    `Hello, I'm ${
      config.botName
    }, thanks for inviting me to your server!\nBefore I can start getting tweets I'll need a text channel where I have permission to write messages & send embeds, please. It'd be nice if I could get reaction permissions in it, too!\nYou can get a list of my commands with 
      ${
        config.prefix
      }help. I hope you are satisfied with my services.\n\nMy creator is Tom'#4242, please don't hesitate to friend him & message him about any issues or feature ideas.`
  );
});

discord.onGuildDelete(gets.rmGuild);

discord.onReady(() => {
  // If our name changed, set it
  if (discord.user().username !== config.botName) {
    discord.user().setUsername(config.botName);
  }
  users.load(() => {
    // All users have been registered, we can request the stream from Twitter
    twitter.createStream();
    // ... And save any changes we made
    users.save();
  });
});

process.on("unhandledRejection", function(err) {
  console.error(new Date() + ": Unhandled exception:");
  console.error(err);
});

console.log("Server launched at " + new Date());
discord.login(pw.dToken);
