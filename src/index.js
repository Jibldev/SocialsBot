require("./utils/keepAlive.js");
console.log("✅ Bot en train de démarrer...");
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { getLatestTweet } = require("./services/twitterFetcher.js");
const { setTweet, isNewTweet } = require("./utils/tweetCache");

const { getLatestPatreonPost } = require("./patreon/patreonFetcher.js");
const { setPost, isNewPost } = require("./patreon/patreonCache.js");

// 🧯 Catch global errors
process.on("uncaughtException", (err) => {
  console.error("🔥 Erreur non interceptée  :", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Rejet de promesse non géré  :", reason);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const DISCORD_CHANNEL_IDPATREON = process.env.DISCORD_CHANNEL_IDPATREON;

//************     TWITTER      **************/

// 📌 Préparation de la liste dynamique des comptes Twitter à suivre
const feeds = [];
for (let i = 1; i <= 10; i++) {
  const username = process.env[`TWITTER_USER_ID_${i}`];
  if (username) feeds.push(username);
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
        const roleId = "1307059893538394214";
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
- *Rewards are posted in ${channelLink} shortly after rewards have been achieved, please be patient if the reward isn't here yet - thanks!* ${emojiMelody} 
- To be notified of undressing games, please select your role in <id:customize> `;

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

//************     PATREON      **************/

async function checkForNewPatreonPosts() {
  console.log(
    "🔁 checkForNewPatreonPosts lancé à",
    new Date().toLocaleString()
  );
  try {
    const post = await getLatestPatreonPost();
    console.log(`[Patreon] Résultat :`, post);

    if (!post) {
      console.log(`[Patreon] Aucun post trouvé.`);
      return;
    }

    if (isNewPost(post)) {
      setPost(post);

      const channel = await client.channels.fetch(DISCORD_CHANNEL_IDPATREON);
      const roleId = "1100801877869875276";

      const emojiCrown = "<a:YellowCrown:1323735636913422347>";
      const emojiHearts = "<a:hearts:1320778528781897748>";

      // 🎯 Message custom Patreon
      const rawMessage = `<@&${roleId}>
# Today's Patreon set has been published! ${emojiHearts}
# ${emojiCrown} ${post.title}
*Full set on Patreon now!:*
Check out the post and support:
- ${post.url}`;

      // Nettoyage du message
      const clean = (str) => str.normalize("NFKC").replace(/^[ \t]+/gm, "");
      const messageContent = clean(rawMessage);

      // Envoi sur Discord
      await channel.send({
        content: messageContent,
        embeds: [
          {
            title: post.title,
            description: `[Voir le post sur Patreon](${post.url})\n\n${post.content}`,
            image: { url: post.image },
            color: 0xff66cc,
          },
        ],
      });

      console.log(`[Patreon] Post publié : ${post.url}`);
    } else {
      console.log(`[Patreon] Aucun nouveau post.`);
    }
  } catch (err) {
    console.error("[Patreon] Erreur :", err);
  }
}

//********* ✅ Démarrage du bot *********//
client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Définis les heures fixes pour les checks (format 24h et minutes, Europe/Paris)
  const checkTimes = [{ hour: 13, minute: 0 }];

  // Pour éviter les doublons : on garde l'heure et la minute du dernier check
  let lastCheckedKey = null;

  // Fonction pour obtenir l'heure et la minute en Europe/Paris (GMT+2)
  const getParisTime = () => {
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour").value);
    const minute = Number(parts.find((p) => p.type === "minute").value);
    return { hour, minute };
  };

  setInterval(() => {
    const { hour: currentHour, minute: currentMinute } = getParisTime();

    for (const { hour, minute } of checkTimes) {
      const key = `${hour}:${minute}`;
      if (
        currentHour === hour &&
        currentMinute === minute &&
        lastCheckedKey !== key
      ) {
        console.log(
          `⏰ Check des tweets à ${hour}h${minute < 10 ? "0" + minute : minute}`
        );
        checkForNewTweets();
        checkForNewPatreonPosts();
        lastCheckedKey = key;
      }
    }
  }, 60 * 1000); // Vérifie toutes les 60 secondes
});

client.login(process.env.DISCORD_TOKEN);
