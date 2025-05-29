require("dotenv").config();
const axios = require("axios");

const PATREON_ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

async function getLatestPatreonPost() {
  try {
    const res = await axios.get(
      `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/posts?include=images&sort=-published_at`,
      {
        headers: { Authorization: `Bearer ${PATREON_ACCESS_TOKEN}` },
      }
    );

    const post = res.data.data[0]; // Le plus récent
    if (!post) return null;

    const title = post.attributes.title;
    const url = post.attributes.url;
    const content = post.attributes.content || "";
    const image =
      res.data.included?.[0]?.attributes?.image_urls?.original || null;

    return { id: post.id, title, url, content, image };
  } catch (err) {
    console.error("[Patreon Fetcher] Erreur :", err);
    return null;
  }
}

module.exports = { getLatestPatreonPost };
