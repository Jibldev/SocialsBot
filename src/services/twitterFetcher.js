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
      expansions: ["attachments.media_keys"],
      "media.fields": ["type", "url", "preview_image_url"],
      "tweet.fields": ["created_at", "attachments", "text"],
      max_results: 5,
    });

    const tweets = timeline.data?.data;
    const media = timeline.data?.includes?.media;

    if (!tweets || !media) return null;

    for (const tweet of tweets) {
      const mediaKeys = tweet.attachments?.media_keys;
      if (!mediaKeys) continue;

      const tweetMedia = media.filter((m) => mediaKeys.includes(m.media_key));

      const hasPhoto = tweetMedia.some((m) => m.type === "photo");
      if (!hasPhoto) continue;

      return {
        id: tweet.id,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        text: tweet.text,
        date: tweet.created_at,
      };
    }

    return null; // Aucun tweet avec image
  } catch (err) {
    console.error("[Twitter Fetcher] Erreur :", err);
    return null;
  }
}

module.exports = {
  getLatestTweet,
};
