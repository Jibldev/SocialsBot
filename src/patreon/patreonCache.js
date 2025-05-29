const fs = require("fs");
const path = "./lastPatreonPost.json";

let lastPost = null;

function setPost(post) {
  lastPost = post;
  try {
    fs.writeFileSync(path, JSON.stringify(post, null, 2));
  } catch (err) {
    console.error("❌ Erreur lors de la sauvegarde du post Patreon :", err);
  }
}

function getPost() {
  if (!lastPost && fs.existsSync(path)) {
    try {
      lastPost = JSON.parse(fs.readFileSync(path, "utf8"));
    } catch (err) {
      console.error("❌ Erreur lors de la lecture du post Patreon :", err);
      lastPost = null;
    }
  }
  return lastPost;
}

function isNewPost(post) {
  return !lastPost || post.id !== lastPost.id;
}

module.exports = { setPost, getPost, isNewPost };
