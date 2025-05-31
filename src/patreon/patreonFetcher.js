require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");

const PATREON_ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

async function getLatestPatreonPost() {
  try {
    const res = await axios.get(
      `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/posts?page[count]=10`, // On récupère 10 posts pour plus de sûreté
      {
        headers: {
          Authorization: `Bearer ${PATREON_ACCESS_TOKEN}`,
          "User-Agent": "SocialsBot/1.0",
        },
      }
    );

    let posts = res.data.data;
    if (!posts || posts.length === 0) return null;

    // Filtrer les posts non épinglés
    posts = posts.filter((post) => post.attributes.is_pinned === false);

    // Trier par published_at décroissant
    posts.sort(
      (a, b) =>
        new Date(b.attributes.published_at) -
        new Date(a.attributes.published_at)
    );

    const latestPost = posts[0];
    if (!latestPost) {
      console.log("[Patreon] Aucun post non épinglé trouvé.");
      return null;
    }

    const postId = latestPost.id;
    const title = latestPost.attributes.title || "(No Title)";
    const url = `https://www.patreon.com/posts/${postId}`;

    let image = latestPost.attributes.image?.large_url || null;

    if (!image && latestPost.attributes.content) {
      const $ = cheerio.load(latestPost.attributes.content);
      image = $("img").first().attr("src") || null;
    }

    console.log("[Patreon] Titre:", title);
    console.log("[Patreon] Image trouvée:", image || "Pas d'image");

    return { id: postId, title, url, image };
  } catch (err) {
    console.error("[Patreon Fetcher] Erreur :", err.response?.data || err);
    return null;
  }
}

module.exports = { getLatestPatreonPost };
