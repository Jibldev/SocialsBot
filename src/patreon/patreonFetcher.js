require("dotenv").config();
const axios = require("axios");

const PATREON_ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

async function getLatestPatreonPost() {
  try {
    // Étape 1 : Récupérer l'ID de la dernière publication
    const postsRes = await axios.get(
      `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/posts?sort=-published_at&page[count]=1`,
      {
        headers: {
          Authorization: `Bearer ${PATREON_ACCESS_TOKEN}`,
          "User-Agent": "SocialsBot/1.0",
        },
      }
    );

    const latestPost = postsRes.data.data[0];
    if (!latestPost) return null;

    const postId = latestPost.id;

    // Étape 2 : Récupérer les détails de la publication
    const postRes = await axios.get(
      `https://www.patreon.com/api/oauth2/v2/posts/${postId}?fields[post]=title,content,url,image_url,thumbnail_url`,
      {
        headers: {
          Authorization: `Bearer ${PATREON_ACCESS_TOKEN}`,
          "User-Agent": "SocialsBot/1.0",
        },
      }
    );

    const postData = postRes.data.data;
    const attributes = postData.attributes;

    const title = attributes.title || "(No Title)";
    const url = attributes.url || null;
    const content = attributes.content || "";
    const image = attributes.image_url || attributes.thumbnail_url || null;

    return { id: postId, title, url, content, image };
  } catch (err) {
    console.error("[Patreon Fetcher] Erreur :", err.response?.data || err);
    return null;
  }
}

module.exports = { getLatestPatreonPost };
