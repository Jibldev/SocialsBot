require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");

const PATREON_ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

async function getLatestPatreonPost() {
  try {
    let url = `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/posts?sort=-published_at&page[count]=10&fields[post]=title,content,url,published_at`;
    const headers = {
      Authorization: `Bearer ${PATREON_ACCESS_TOKEN}`,
      "User-Agent": "SocialsBot/1.0",
    };

    while (url) {
      const res = await axios.get(url, { headers });
      const posts = res.data.data;

      if (!posts || posts.length === 0) {
        console.log("[Patreon] Aucun post récupéré.");
        return null;
      }

      // Rechercher le premier post publié
      for (const post of posts) {
        if (post.attributes.published_at) {
          const postId = post.id;
          const title = post.attributes.title || "(No Title)";
          const postUrl = `https://www.patreon.com/posts/${postId}`;

          // Essayer d'obtenir l'image principale
          let image = null;
          if (post.attributes.content) {
            const $ = cheerio.load(post.attributes.content);
            image = $("img").first().attr("src") || null;
          }

          console.log("[Patreon] Dernier post trouvé :", title);
          console.log("[Patreon] URL :", postUrl);
          console.log("[Patreon] Image :", image || "Pas d'image");

          return { id: postId, title, url: postUrl, image };
        }
      }

      // Passer à la page suivante si disponible
      url = res.data.links?.next || null;
    }

    console.log("[Patreon] Aucun post publié trouvé.");
    return null;
  } catch (err) {
    console.error("[Patreon Fetcher] Erreur :", err.response?.data || err);
    return null;
  }
}

module.exports = { getLatestPatreonPost };
