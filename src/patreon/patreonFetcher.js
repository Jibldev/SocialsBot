require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");

const PATREON_ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

async function getLatestPatreonPost() {
  try {
    const res = await axios.get(
      `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/posts?sort=-published_at&page[count]=1&fields[post]=title,content,url`,
      {
        headers: {
          Authorization: `Bearer ${PATREON_ACCESS_TOKEN}`,
          "User-Agent": "SocialsBot/1.0",
        },
      }
    );

    let posts = res.data.data;
    if (!posts || posts.length === 0) {
      console.log("[Patreon] Aucun post récupéré.");
      return null;
    }

    console.log("[Patreon] Liste des posts (debug) :");
    posts.forEach((post, index) => {
      console.log(
        `${index + 1}. ${
          post.attributes.title || "(No Title)"
        } | published_at: ${post.attributes.published_at} | status: ${
          post.attributes.status
        } | is_pinned: ${post.attributes.is_pinned}`
      );
    });

    if (posts.length === 0) {
      console.log("[Patreon] Aucun post publié trouvé.");
      return null;
    }

    // Trier localement par date de publication (décroissant, sécurité)
    posts.sort(
      (a, b) =>
        new Date(b.attributes.published_at) -
        new Date(a.attributes.published_at)
    );

    const latestPost = posts[0];
    if (!latestPost) {
      console.log("[Patreon] Aucun post final trouvé.");
      return null;
    }

    const postId = latestPost.id;
    const title = latestPost.attributes.title || "(No Title)";
    const url = `https://www.patreon.com/posts/${postId}`;

    // Essayer d'obtenir l'image principale
    let image = latestPost.attributes.image?.large_url || null;

    // Si pas d'image principale, fallback : parser le contenu HTML pour trouver une <img>
    if (!image && latestPost.attributes.content) {
      console.log(
        "[Patreon] Contenu HTML brut du post :",
        latestPost.attributes.content
      );
      const $ = cheerio.load(latestPost.attributes.content);
      image = $("img").first().attr("src") || null;
    }

    console.log("[Patreon] Dernier post trouvé :", title);
    console.log("[Patreon] URL :", url);
    console.log("[Patreon] Image :", image || "Pas d'image");

    return { id: postId, title, url, image };
  } catch (err) {
    console.error("[Patreon Fetcher] Erreur :", err.response?.data || err);
    return null;
  }
}

module.exports = { getLatestPatreonPost };
