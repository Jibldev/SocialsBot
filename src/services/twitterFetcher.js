require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

/**
 * Récupère le dernier tweet d'un utilisateur
 * @param {string} userId - L'ID numérique du compte Twitter
 * @returns {object|null} - Données du tweet ou null si erreur
 */
async function getLatestTweet(userId) {
  try {
    const timeline = await twitterClient.v2.userTimeline(userId, {
      exclude: "retweets,replies",
      max_results: 5,
      "tweet.fields": "created_at",
    });

    const tweets = timeline.data.data;
    if (!tweets || tweets.length === 0) return null;

    const latest = tweets[0];

    return {
      id: latest.id,
      url: `https://twitter.com/i/web/status/${latest.id}`,
      text: latest.text,
      date: latest.created_at,
    };
  } catch (err) {
    console.error("[Twitter Fetcher] Erreur :", err);
    return null;
  }
}

/**
 * ℹ️ Récupère le nom et le pseudo Twitter d’un utilisateur
 * @param {string} userId - L'ID numérique du compte Twitter
 * @returns {{ name: string, username: string } | null}
 */
async function getUserInfo(userId) {
  try {
    const user = await twitterClient.v2.user(userId);
    return {
      name: user.data.name,
      username: user.data.username,
    };
  } catch (err) {
    console.error(`[getUserInfo] Erreur :`, err);
    return null;
  }
}

module.exports = {
  getLatestTweet,
  getUserInfo,
};
