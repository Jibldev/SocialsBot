require("./utils/keepAlive.js");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLatestTweet } = require("./services/twitterFetcher.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// 📌 Préparation de la liste dynamique des comptes Twitter à suivre
const feeds = [];
for (let i = 1; i <= 10; i++) {
  const id = process.env[`TWITTER_USER_ID_${i}`];
  if (id) feeds.push(id);
}
if (process.env.TWITTER_USER_ID) feeds.unshift(process.env.TWITTER_USER_ID);

// 🧠 Cache mémoire pour éviter les doublons
const lastTweetIds = {};

// 🔁 Vérifie s’il y a un nouveau tweet pour chaque compte
async function checkForNewTweets() {
  for (const twitterUserId of feeds) {
    try {
      const tweet = await getLatestTweet(twitterUserId);
      if (!tweet) continue;

      if (lastTweetIds[twitterUserId] !== tweet.id) {
        lastTweetIds[twitterUserId] = tweet.id;

        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);

        const { EmbedBuilder } = require("discord.js");
        const embed = new EmbedBuilder()
          .setColor(0x1da1f2)
          .setTitle("📢 Nouveau tweet disponible !")
          .setDescription(
            "👑 **Elon Mush TweeT**\nOpen link to like and repost ↓"
          )
          .setTimestamp(new Date(tweet.date))
          .setFooter({
            text: "Lewdiii Feed",
            iconURL: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
          });

        await channel.send({
          content: tweet.url, // Nécessaire pour garder l’aperçu automatique Twitter
          embeds: [embed],
        });

        console.log(`[${twitterUserId}] Tweet posté avec embed : ${tweet.url}`);
      } else {
        console.log(`[${twitterUserId}] Aucun nouveau tweet.`);
      }
    } catch (err) {
      if (err.code === 429) {
        const resetTime = new Date(
          err.rateLimit?.reset * 1000
        ).toLocaleTimeString();
        console.warn(
          `⚠️ Rate limit atteint pour ${twitterUserId}. Retry vers ${resetTime}.`
        );
      } else {
        console.error(`[${twitterUserId}] Erreur :`, err);
      }
    }
  }
}

// ✅ Démarrage du bot
client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  const delay = Number(process.env.START_DELAY_MS || 0);
  console.log(`⏱️ Première vérification dans ${delay / 1000}s...`);

  setTimeout(() => {
    checkForNewTweets();
    setInterval(checkForNewTweets, 15 * 60 * 1000); // Toutes les 15 min
  }, delay);
});

client.login(process.env.DISCORD_TOKEN);
