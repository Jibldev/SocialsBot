require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// Lire le pseudo depuis la ligne de commande
const username = process.argv[2];

if (!username) {
  console.error("❌ Veuillez indiquer un nom d'utilisateur Twitter.");
  console.log("Exemple : node src/services/getUserId.js Spideraxe30");
  process.exit(1);
}

async function getUserId(username) {
  try {
    const user = await client.v2.userByUsername(username);
    console.log(`✅ ID de @${username} : ${user.data.id}`);
  } catch (err) {
    if (err?.data?.title === "Not Found Error") {
      console.error(`❌ Le compte @${username} est introuvable.`);
    } else {
      console.error("❌ Erreur inconnue :", err);
    }
  }
}

getUserId(username);
