require("./utils/keepAlive.js");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLatestTweet, getUserInfo } = require("./services/twitterFetcher.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Préparer la liste des comptes Twitter à suivre dynamiquement
const feeds = [];
for (let i = 1; i <= 10; i++) {
  const id = process.env[`TWITTER_USER_ID_${i}`];
  if (id) feeds.push(id);
}
if (process.env.TWITTER_USER_ID) feeds.unshift(process.env.TWITTER_USER_ID);

const lastTweetIds = {}; // Clé : twitterUserId → tweetId déjà posté
const userInfoCache = {}; // Clé : twitterUserId → username (stocké au boot uniquement)

// 🔁 Initialiser le cache des pseudos Twitter une seule fois
async function preloadUserInfos() {
  console.log("🔍 Préchargement des noms d'utilisateur Twitter...");
  for (const twitterUserId of feeds) {
    try {
      const info = await getUserInfo(twitterUserId);
      if (info && info.name) {
        userInfoCache[twitterUserId] = info.name;
        console.log(`✅ Nom détecté : ${info.name}`);
      } else {
        userInfoCache[twitterUserId] = twitterUserId;
        console.warn(`⚠️ Aucun nom trouvé pour ${twitterUserId}`);
      }
      console.log(`✅ @${userInfoCache[twitterUserId]} préchargé.`);
    } catch (err) {
      console.error(
        `❌ Erreur lors du chargement de l'utilisateur ${twitterUserId} :`,
        err
      );
      userInfoCache[twitterUserId] = twitterUserId;
    }
  }
}

// 🔁 Vérifie tous les X minutes s’il y a de nouveaux tweets
async function checkForNewTweets() {
  for (const twitterUserId of feeds) {
    try {
      const tweet = await getLatestTweet(twitterUserId);
      if (!tweet) continue;

      if (lastTweetIds[twitterUserId] !== tweet.id) {
        lastTweetIds[twitterUserId] = tweet.id;
        const displayName = userInfoCache[twitterUserId] || twitterUserId;
        const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);

        await channel.send(
          `📢 Nouveau tweet de **${displayName}** !\n${tweet.url}`
        );
        console.log(`[${displayName}] Nouveau tweet posté : ${tweet.url}`);
      } else {
        console.log(`[${userInfoCache[twitterUserId]}] Aucun nouveau tweet.`);
      }
    } catch (err) {
      if (err.code === 429) {
        const resetTime = new Date(
          err.rateLimit?.reset * 1000
        ).toLocaleTimeString();
        console.warn(
          `⚠️ Rate limit atteint pour ${twitterUserId}. Prochaine tentative vers ${resetTime}.`
        );
      } else {
        console.error(`[${twitterUserId}] Erreur :`, err);
      }
    }
  }
}

client.once("ready", async () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  await preloadUserInfos();

  const delay = Number(process.env.START_DELAY_MS || 0);
  console.log(
    `⏱️ Attente de ${delay / 1000}s avant la première vérification...`
  );

  setTimeout(() => {
    checkForNewTweets();
    setInterval(checkForNewTweets, 15 * 60 * 1000); // toutes les 15 min
  }, delay);
});

client.login(process.env.DISCORD_TOKEN);
