require("/keepAlive");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLatestTweet } = require("./twitterFetcher");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const TWITTER_USER_ID = process.env.TWITTER_USER_ID;

let lastTweetId = null;

async function checkForNewTweet() {
  const tweet = await getLatestTweet(TWITTER_USER_ID);
  if (!tweet) return;

  if (tweet.id !== lastTweetId) {
    lastTweetId = tweet.id;

    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    await channel.send(`📢 Nouveau tweet publié !\n${tweet.url}`);
    console.log(`[Tweet posté] ${tweet.url}`);
  } else {
    console.log("Aucun nouveau tweet détecté.");
  }
}

client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);

  // Vérifie immédiatement au démarrage
  checkForNewTweet();

  // Puis toutes les 5 minutes
  setInterval(checkForNewTweet, 5 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
