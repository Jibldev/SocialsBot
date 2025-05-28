require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

/*
 * 🔁 Récupère le dernier tweet original d’un utilisateur contenant une image
 * ❌ Ignore les réponses (même à soi-même)
 * ❌ Ignore les tweets sans image
 * */

async function getLatestTweet(userId) {
  try {
    const timeline = await twitterClient.v2.userTimeline(userId, {
      exclude: "retweets,replies",
      expansions: ["attachments.media_keys"],
      "media.fields": ["type", "url", "preview_image_url"],
      "tweet.fields": [
        "created_at",
        "attachments",
        "text",
        "referenced_tweets",
      ],
      max_results: 5,
    });

    const tweets = timeline.data?.data;
    const media = timeline.data?.includes?.media;

    if (!tweets || !media) return null;

    for (const tweet of tweets) {
      // 🚫 Ignore les réponses, même celles à soi-même
      if (tweet.referenced_tweets?.some((ref) => ref.type === "replied_to")) {
        continue;
      }

      const mediaKeys = tweet.attachments?.media_keys;
      if (!mediaKeys) continue;

      const tweetMedia = media.filter((m) => mediaKeys.includes(m.media_key));
      const hasPhoto = tweetMedia.some((m) => m.type === "photo");
      if (!hasPhoto) continue;

      // ✅ Premier tweet original avec image trouvé
      return {
        id: tweet.id,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        text: tweet.text,
        date: tweet.created_at,
      };
    }

    return null; // Aucun tweet original avec image trouvé
  } catch (err) {
    console.error("[Twitter Fetcher] Erreur :", err);
    return null;
  }
}

module.exports = {
  getLatestTweet,
};
