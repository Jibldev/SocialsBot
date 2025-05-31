require("dotenv").config();
const axios = require("axios");

const PATREON_ACCESS_TOKEN = process.env.PATREON_ACCESS_TOKEN;
const PATREON_CAMPAIGN_ID = process.env.PATREON_CAMPAIGN_ID;

async function getLatestPatreonPost() {
  try {
    const res = await axios.get(
      `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/posts?sort=-published_at&page[count]=1`,
      {
        headers: {
          Authorization: `Bearer ${PATREON_ACCESS_TOKEN}`,
          "User-Agent": "SocialsBot/1.0",
        },
      }
    );

    const latestPost = res.data.data[0];
    if (!latestPost) return null;

    const postId = latestPost.id;
    const title = latestPost.attributes.title || "(No Title)";
    const url = `https://www.patreon.com/posts/${postId}`;

    const image =
      latestPost.attributes.image?.large_url ||
      latestPost.attributes.image?.thumb_url ||
      null;

    return { id: postId, title, url, image };
  } catch (err) {
    console.error("[Patreon Fetcher] Erreur :", err.response?.data || err);
    return null;
  }
}

module.exports = { getLatestPatreonPost };
