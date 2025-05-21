// Cache memory for last tweet and modal.js

const fs = require("fs");
const path = "./lastTweet.json";

let lastTweet = null;

function setTweet(tweet) {
  lastTweet = tweet;
  try {
    fs.writeFileSync(path, JSON.stringify(tweet, null, 2));
  } catch (err) {
    console.error("❌ Erreur lors de la sauvegarde du tweet :", err);
  }
}

function getTweet() {
  if (!lastTweet && fs.existsSync(path)) {
    try {
      lastTweet = JSON.parse(fs.readFileSync(path, "utf8"));
    } catch (err) {
      console.error(
        "❌ Erreur lors de la lecture du tweet depuis le fichier :",
        err
      );
      lastTweet = null;
    }
  }
  return lastTweet;
}

function isNewTweet(tweet) {
  return !lastTweet || tweet.id !== lastTweet.id;
}

module.exports = {
  setTweet,
  getTweet,
  isNewTweet,
};
