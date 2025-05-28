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
const tweetCache = require("../utils/tweetCache");

async function getLatestTweet(username) {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    console.log(`[Scraper Debug] Navigation vers https://x.com/${username}`);
    await page.goto(`https://x.com/${username}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Attend que les tabs apparaissent
    await page.waitForSelector('a[role="tab"]', { timeout: 10000 });

    // Clique sur "Médias"/"Media"
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('a[role="tab"]'));
      for (const tab of tabs) {
        const label = tab.innerText.trim().toLowerCase();
        if (label === "médias" || label === "media") {
          tab.click();
          break;
        }
      }
    });
    // Attend que les tweets avec images chargent
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Attend le premier article (tweet)
    await page.waitForSelector("article", { timeout: 15000 });

    // Récupère TOUS les tweets de l’onglet "Médias"
    const tweets = await page.$$eval("article", (articles) => {
      return articles.map((article) => {
        const text = article.innerText || "";
        const isPinned =
          text.includes("Pinned") ||
          text.includes("Épinglé") ||
          article.querySelector('[data-testid="pin"]') ||
          article.querySelector('svg[data-testid="pin"]') ||
          text.includes("📌");

        const linkElement = article.querySelector('a[href*="/status/"]');
        let tweetId = null,
          link = null;
        if (linkElement && linkElement.href) {
          link = linkElement.href;
          const match = link.match(/\/status\/(\d+)/);
          if (match) tweetId = match[1];
        }

        let image = null;
        const img = article.querySelector('img[src*="media"]');
        if (img && img.src) image = img.src;

        const timeElement = article.querySelector("time");
        const time = timeElement ? timeElement.getAttribute("datetime") : null;

        return {
          tweetId,
          link,
          image,
          time,
          text: text.substring(0, 300),
          isPinned: !!isPinned,
        };
      });
    });

    // Trouve le premier tweet NON épinglé avec image et id
    const tweet = tweets.find(
      (t) => !t.isPinned && t.tweetId && t.image && t.time
    );

    // Récupère le dernier tweet traité depuis le cache
    const lastProcessedTweet = tweetCache.getTweet();

    if (
      tweet &&
      tweet.tweetId &&
      tweet.image &&
      tweet.time &&
      (!lastProcessedTweet || tweet.tweetId !== lastProcessedTweet.id)
    ) {
      // Nouveau tweet trouvé
      const newTweet = {
        id: tweet.tweetId,
        text: tweet.text,
        image: tweet.image,
        url: tweet.link,
        timestamp: tweet.time,
        processedAt: new Date().toISOString(),
      };
      tweetCache.setTweet(newTweet);
      console.log(
        `[Scraper Debug] ✅ Nouveau tweet trouvé : ID=${tweet.tweetId}`
      );
      return {
        text: newTweet.text,
        image: newTweet.image,
        url: newTweet.url,
        id: newTweet.id,
      };
    } else {
      console.log(`[Scraper Debug] Aucun nouveau tweet avec image trouvé.`);
      return null;
    }
  } catch (err) {
    console.error("[Twitter Scraper] Erreur :", err.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  getLatestTweet,
};
