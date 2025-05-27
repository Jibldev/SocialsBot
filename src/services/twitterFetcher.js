/*** 

require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

/**
 * 🔁 Récupère le dernier tweet original d’un utilisateur contenant une image
 * ❌ Ignore les réponses (même à soi-même)
 * ❌ Ignore les tweets sans image

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

***/

const axios = require("axios");
const cheerio = require("cheerio");

/**
 * 🔁 Récupère le dernier tweet original d’un utilisateur contenant une image
 * ❌ Ignore les réponses, les retweets
 * ❌ Ignore les tweets plus vieux que 8h
 */
async function getLatestTweet(username) {
  try {
    const url = `https://x.com/${username}`;
    const { data: html } = await axios.get(url, {
      timeout: 30000, // 30 secondes (plus long pour éviter les timeouts)
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
    });

    const $ = cheerio.load(html);
    let foundTweet = null;

    $('div[data-testid="cellInnerDiv"]').each((i, el) => {
      const tweetEl = $(el);

      const isRetweet = tweetEl.text().includes("Retweeted");
      const hasImage = tweetEl.find('img[src*="twimg.com/media"]').length > 0;

      const tweetDateTime = tweetEl.find("time").attr("datetime");
      if (!tweetDateTime) return;

      const tweetDate = new Date(tweetDateTime);
      const now = new Date();
      const diffHours = (now - tweetDate) / (1000 * 60 * 60);

      if (diffHours > 13) return;

      if (!isRetweet && hasImage && !foundTweet) {
        const tweetText = tweetEl.text().trim();
        const imageUrl = tweetEl
          .find('img[src*="twimg.com/media"]')
          .attr("src");
        const tweetUrl = `https://x.com${tweetEl
          .find('a[href*="/status/"]')
          .attr("href")}`;

        foundTweet = {
          text: tweetText,
          image: imageUrl,
          url: tweetUrl,
        };
      }
    });

    return foundTweet;
  } catch (err) {
    console.error("[Twitter Scraper] Erreur :", err.message);
    return null;
  }
}

module.exports = {
  getLatestTweet,
};
