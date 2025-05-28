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

/**
 * 🔁 Récupère le dernier tweet original d'un utilisateur contenant une image
 * ❌ Ignore les réponses, les retweets, les tweets épinglés
 * ❌ Ignore les tweets déjà traités (cache)
 * ✅ Doit contenir une image
 */
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

    await page.waitForSelector("article", { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Scroll pour charger plus de contenu
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 3);
    });
    await page.waitForTimeout(2000);

    console.log(`[Scraper Debug] Analyse des tweets...`);

    const tweets = await page.$$eval("article", (articles) => {
      return articles.map((article, index) => {
        try {
          const text = article.innerText || "";

          // Vérifier si c'est un tweet épinglé
          const isPinned =
            text.includes("Pinned") ||
            text.includes("Épinglé") ||
            article.querySelector('[data-testid="pin"]') ||
            article.querySelector('svg[data-testid="pin"]') ||
            text.includes("📌");

          // Vérifier si c'est un retweet
          const isRetweet =
            text.includes("Retweeted") ||
            text.includes("reposted") ||
            text.includes("a reposté") ||
            article.querySelector('[data-testid="socialContext"]') ||
            article.querySelector('svg[data-testid="retweet"]') ||
            text.match(/^RT @/);

          // Vérifier si c'est une réponse
          const isReply =
            text.includes("Replying to") ||
            text.includes("En réponse à") ||
            article.querySelector('[data-testid="reply"]') ||
            text.match(/^@\w+/);

          // Extraire l'ID du tweet depuis l'URL
          const linkElement = article.querySelector('a[href*="/status/"]');
          let tweetId = null;
          let link = null;

          if (linkElement && linkElement.href) {
            link = linkElement.href;
            const match = link.match(/\/status\/(\d+)/);
            if (match) {
              tweetId = match[1];
            }
          }

          // Chercher les images avec différents sélecteurs
          let image = null;
          const imageSelectors = [
            'img[src*="twimg.com/media"]',
            'img[src*="pbs.twimg.com/media"]',
            'img[alt="Image"]',
            '[data-testid="tweetPhoto"] img',
            'div[data-testid="tweetPhoto"] img',
            '[data-testid="card.layoutLarge.media"] img',
          ];

          for (const selector of imageSelectors) {
            const img = article.querySelector(selector);
            if (
              img &&
              img.src &&
              !img.src.includes("profile") &&
              !img.src.includes("avatar") &&
              !img.src.includes("emoji") &&
              img.src.includes("media")
            ) {
              image = img.src;
              // Nettoyer l'URL de l'image pour avoir la version originale
              image = image.replace(/&name=\w+/, "&name=large");
              break;
            }
          }

          // Chercher le timestamp
          const timeElement = article.querySelector("time");
          const time = timeElement
            ? timeElement.getAttribute("datetime")
            : null;

          return {
            index,
            id: tweetId,
            text: text.substring(0, 300),
            image,
            link,
            time,
            isPinned: !!isPinned,
            isRetweet: !!isRetweet,
            isReply: !!isReply,
            hasTime: !!time,
            hasImage: !!image,
            hasId: !!tweetId,
          };
        } catch (error) {
          return {
            index,
            error: error.message,
            id: null,
            text: "",
            image: null,
            link: null,
            time: null,
            isPinned: false,
            isRetweet: false,
            isReply: false,
          };
        }
      });
    });

    console.log(`[Scraper Debug] ${tweets.length} articles trouvés`);

    // Récupérer le dernier tweet traité depuis le cache
    const lastProcessedTweet = tweetCache.getTweet();
    console.log(
      `[Scraper Debug] Dernier tweet en cache: ${
        lastProcessedTweet ? lastProcessedTweet.id : "aucun"
      }`
    );

    const now = new Date();

    for (const [i, tweet] of tweets.entries()) {
      console.log(
        `[Scraper Debug] Tweet ${i}: ID=${tweet.id}, hasImage=${tweet.hasImage}, isPinned=${tweet.isPinned}, isRetweet=${tweet.isRetweet}, isReply=${tweet.isReply}`
      );

      // Ignorer si pas d'ID (impossible de vérifier les doublons)
      if (!tweet.hasId) {
        console.log(`[Scraper Debug] Tweet ${i} ignoré : pas d'ID`);
        continue;
      }

      // Ignorer les tweets épinglés
      if (tweet.isPinned) {
        console.log(`[Scraper Debug] Tweet ${i} ignoré : épinglé`);
        continue;
      }

      // Ignorer les retweets et réponses
      if (tweet.isRetweet || tweet.isReply) {
        console.log(`[Scraper Debug] Tweet ${i} ignoré : retweet ou réponse`);
        continue;
      }

      // Vérifier qu'il y a une image
      if (!tweet.hasImage) {
        console.log(`[Scraper Debug] Tweet ${i} ignoré : pas d'image`);
        continue;
      }

      // Vérifier qu'il y a un timestamp
      if (!tweet.hasTime) {
        console.log(`[Scraper Debug] Tweet ${i} ignoré : pas de timestamp`);
        continue;
      }

      // Vérifier si c'est un nouveau tweet (pas déjà traité)
      if (lastProcessedTweet && tweet.id === lastProcessedTweet.id) {
        console.log(
          `[Scraper Debug] Tweet ${i} ignoré : déjà traité (ID: ${tweet.id})`
        );
        continue;
      }

      // Vérifier l'âge du tweet (optionnel, tu peux ajuster ou enlever)
      const tweetDate = new Date(tweet.time);
      const diffHours = (now - tweetDate) / (1000 * 60 * 60);

      console.log(
        `[Scraper Debug] Tweet ${i} candidat : diffHours=${diffHours.toFixed(
          2
        )}h, ID=${tweet.id}`
      );

      // Tu peux ajuster cette limite ou l'enlever selon tes besoins
      if (diffHours <= 168) {
        // 7 jours max
        console.log(`[Scraper Debug] ✅ Tweet valide trouvé ! ID: ${tweet.id}`);

        const newTweet = {
          id: tweet.id,
          text: tweet.text,
          image: tweet.image,
          url: tweet.link,
          timestamp: tweet.time,
          processedAt: new Date().toISOString(),
        };

        // Sauvegarder dans le cache pour éviter les doublons
        tweetCache.setTweet(newTweet);

        return {
          text: newTweet.text,
          image: newTweet.image,
          url: newTweet.url,
          id: newTweet.id,
        };
      } else {
        console.log(
          `[Scraper Debug] Tweet ${i} ignoré : trop vieux (${diffHours.toFixed(
            2
          )}h)`
        );
      }
    }

    console.log(
      `[Scraper Debug] Aucun nouveau tweet valide trouvé parmi ${tweets.length} articles`
    );
    return null;
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
