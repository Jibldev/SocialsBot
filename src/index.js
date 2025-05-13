require("./utils/keepAlive.js");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLatestTweet, getUserInfo } = require("./services/twitterFetcher.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Préparer la liste des comptes Twitter à suivre
const feeds = [];

for (let i = 1; i <= 10; i++) {
  const id = process.env[`TWITTER_USER_ID_${i}`];
  if (id) feeds.push(id);
}

// Et on garde le cas sans suffixe (_1)
if (process.env.TWITTER_USER_ID) feeds.unshift(process.env.TWITTER_USER_ID);

const lastTweetIds = {}; // Clé : twitterUserId → tweetId déjà posté
const userInfoCache = {}; // Clé : twitterUserId → username

async function checkForNewTweets() {
  for (const twitterUserId of feeds) {
    try {
      const tweet = await getLatestTweet(twitterUserId);
      if (!tweet) continue;

      // Vérifie si ce tweet a déjà été posté
      if (lastTweetIds[twitterUserId] !== tweet.id) {
        lastTweetIds[twitterUserId] = tweet.id;

        // Récupère ou utilise le pseudo Twitter
        if (!userInfoCache[twitterUserId]) {
          const info = await getUserInfo(twitterUserId);
          userInfoCache[twitterUserId] = info ? info.username : twitterUserId;
        }

        const displayName = userInfoCache[twitterUserId];
        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);

        await channel.send(
          `📢 Nouveau tweet de **@${displayName}** !\n${tweet.url}`
        );
        console.log(`[${displayName}] Nouveau tweet posté : ${tweet.url}`);
      } else {
        console.log(`[${twitterUserId}] Aucun nouveau tweet détecté.`);
      }
    } catch (err) {
      console.error(`[${twitterUserId}] Erreur lors du traitement :`, err);
    }
  }
}

client.once("ready", () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  checkForNewTweets();
  setInterval(checkForNewTweets, 15 * 60 * 1000); // toutes les 15 min
});

client.login(process.env.DISCORD_TOKEN);
