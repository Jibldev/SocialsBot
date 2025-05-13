require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// Remplacer ici par le handle voulu (sans @)
const username = "Spideraxe30";

async function getUserId() {
  try {
    const user = await client.v2.userByUsername(username);
    console.log(`✅ ID de @${username} : ${user.data.id}`);
  } catch (err) {
    console.error("❌ Erreur lors de la récupération de l'ID :", err);
  }
}

getUserId();
