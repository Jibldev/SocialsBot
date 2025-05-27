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

const puppeteer = require("puppeteer");

/**
 * 🔁 Récupère le dernier tweet original d’un utilisateur contenant une image
 * ❌ Ignore les réponses, les retweets
 * ❌ Ignore les tweets plus vieux que 8h
 */
async function getLatestTweet(username) {
  try {
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    await page.goto(`https://x.com/${username}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.waitForSelector("article", { timeout: 15000 });

    const tweets = await page.$$eval("article", (articles) =>
      articles.map((a) => {
        const text = a.innerText;
        const image = a.querySelector('img[src*="twimg.com/media"]')?.src;
        const link = a.querySelector('a[href*="/status/"]')?.href;
        const time = a.querySelector("time")?.getAttribute("datetime");
        return { text, image, link, time };
      })
    );

    await browser.close();

    const now = new Date();
    for (const tweet of tweets) {
      if (!tweet.image || !tweet.time) continue;

      const tweetDate = new Date(tweet.time);
      const diffHours = (now - tweetDate) / (1000 * 60 * 60);

      console.log(
        `[Scraper Debug] Tweet trouvé : diffHours=${diffHours.toFixed(
          2
        )}h, hasImage=${!!tweet.image}`
      );

      if (diffHours <= 16) {
        return {
          text: tweet.text,
          image: tweet.image,
          url: tweet.link,
        };
      } else {
        console.log(
          `[Scraper Debug] Tweet ignoré : trop vieux (${diffHours.toFixed(2)}h)`
        );
      }
    }

    return null; // Aucun tweet valide trouvé
  } catch (err) {
    console.error("[Twitter Scraper] Erreur :", err.message);
    return null;
  }
}

module.exports = {
  getLatestTweet,
};
