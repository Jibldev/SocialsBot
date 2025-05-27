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
        const roleId = "1107220620795707513";
        const characterName = tweet.text?.split("-")[0].trim() || "???";

        const emojiCrown = "<a:YellowCrown:1323735636913422347>";
        const emojiMelody = "<a:melody_heart:1323736627180212235>";
        const emojiHearts = "<a:hearts:1320778528781897748>";

        const channelLink = "<#1315321592405819422>";

        // Remplace 'twitter.com' ou 'x.com' par 'fxtwitter.com' dans l'URL du tweet
        const tweetUrl = tweet.url.replace(
          /(twitter\.com|x\.com)/,
          "fxtwitter.com"
        );

        const clean = (str) => str.normalize("NFKC").replace(/^[ \\t]+/gm, "");

        const rawMessage = `<@&${roleId}>
# Undressing Game! ${emojiHearts}
# ${emojiCrown} ${characterName}
Open link to **like** and **repost**:
- ${tweetUrl}
- *Rewards are posted in ${channelLink} shortly after rewards have been achieved, please be patient if the reward isn't here yet - thanks!* ${emojiMelody} `;

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

  // Définis les heures fixes pour les checks (format 24h)
  const checkHours = [0, 13, 19]; // 8h, 14h, 20h

  // Démarre un intervalle qui vérifie l'heure chaque minute
  setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Vérifie si c'est l'heure exacte et si on est à la minute 0 (exemple : 14:00)
    if (checkHours.includes(currentHour) && currentMinute === 0) {
      console.log(`⏰ Check des tweets à ${currentHour}h`);
      checkForNewTweets();
    }
  }, 60 * 1000); // Vérifie toutes les 60 secondes
});

client.login(process.env.DISCORD_TOKEN);
