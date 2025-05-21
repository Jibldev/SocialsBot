require("./utils/keepAlive.js");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLatestTweet } = require("./services/twitterFetcher.js");
const { setTweet, isNewTweet } = require("./utils/tweetCache");

// 🧯 Catch global errors
process.on("uncaughtException", (err) => {
  console.error("🔥 Erreur non interceptée :", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Rejet de promesse non géré :", reason);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// 📌 Préparation de la liste dynamique des comptes Twitter à suivre
const feeds = [];
for (let i = 1; i <= 10; i++) {
  const id = process.env[`TWITTER_USER_ID_${i}`];
  if (id) feeds.push(id);
}
if (process.env.TWITTER_USER_ID) feeds.unshift(process.env.TWITTER_USER_ID);

console.log("📝 Feeds configurés :", feeds.join(", "));

// 🧠 Cache mémoire pour éviter les doublons
const lastTweetIds = {};

// 🔁 Vérifie s’il y a un nouveau tweet pour chaque compte
async function checkForNewTweets() {
  console.log("🔁 checkForNewTweets lancé à", new Date().toLocaleString());
  for (const twitterUserId of feeds) {
    try {
      console.log(`[${twitterUserId}] Recherche d'un nouveau tweet...`);
      const tweet = await getLatestTweet(twitterUserId);
      console.log(`[${twitterUserId}] Résultat :`, tweet);

      if (!tweet) {
        console.log(`[${twitterUserId}] Aucun tweet trouvé (timeline vide).`);
        continue;
      }

      if (isNewTweet(tweet)) {
        lastTweetIds[twitterUserId] = tweet.id;
        setTweet(tweet);

        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
        const roleId = "112233445566778899";
        const characterName = tweet.text?.split("-")[0].trim() || "???";

        const clean = (str) => str.normalize("NFKC").replace(/^[ \\t]+/gm, "");

        const rawMessage = `<@&${roleId}>
# 📢 New tweet !
## 👑 ${characterName}
Open the link to **like** and **repost**:
- ${tweet.url}
- *Share and follow for more*`;

        const messageContent = clean(rawMessage);

        await channel.send({
          content: messageContent,
        });

        console.log(
          `[${twitterUserId}] Tweet posté avec message : ${tweet.url}`
        );
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

  const delay = Number(process.env.START_DELAY_MS || 60000);
  console.log(`⏱️ Première vérification dans ${delay / 1000}s...`);

  setTimeout(() => {
    console.log("⏳ Lancement initial de checkForNewTweets()");
    checkForNewTweets();
    setInterval(checkForNewTweets, 30 * 60 * 1000); // Toutes les 30 min
  }, delay);
});

client.login(process.env.DISCORD_TOKEN);
