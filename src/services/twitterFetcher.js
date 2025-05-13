require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

/**
 * 🔁 Récupère le dernier tweet d’un utilisateur
 */
async function getLatestTweet(userId) {
  try {
    const timeline = await twitterClient.v2.userTimeline(userId, {
      exclude: "retweets,replies",
      max_results: 5,
      "tweet.fields": "created_at",
    });

    const tweet = timeline.data?.data?.[0];
    if (!tweet) return null;

    return {
      id: tweet.id,
      url: `https://twitter.com/i/web/status/${tweet.id}`,
      text: tweet.text,
      date: tweet.created_at,
    };
  } catch (err) {
    console.error("[Twitter Fetcher] Erreur :", err);
    return null;
  }
}

/**
 * ℹ️ Récupère le nom complet et pseudo Twitter
 */
async function getUserInfo(userId) {
  try {
    const user = await twitterClient.v2.user(userId);
    return {
      name: user.data.name,
      username: user.data.username,
    };
  } catch (err) {
    console.error(
      `[getUserInfo] ❌ Erreur lors de la récupération de ${userId} :`,
      err
    );
    return null;
  }
}

module.exports = {
  getLatestTweet,
  getUserInfo,
};
