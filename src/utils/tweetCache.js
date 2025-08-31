const HAS_REDIS =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let memoryId = null;
let redis = null;

if (HAS_REDIS) {
  // Fonctionne en CommonJS
  const { Redis } = require("@upstash/redis");
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const KEY = "socialsbot:lastTweetId";

/** Récupère l'ID du dernier tweet (persistant) */
async function getLastId() {
  if (!HAS_REDIS) return memoryId;
  try {
    return await redis.get(KEY); // string | null
  } catch (e) {
    console.error("[tweetCache] Redis GET error:", e);
    return memoryId;
  }
}

/** Enregistre l'ID du dernier tweet (persistant) */
async function setTweet(tweet) {
  const id = tweet?.id ?? tweet;
  memoryId = id; // toujours garder une copie mémoire
  if (!HAS_REDIS) return id;
  try {
    await redis.set(KEY, id);
  } catch (e) {
    console.error("[tweetCache] Redis SET error:", e);
  }
  return id;
}

/** Compare l'ID courant avec le dernier connu */
async function isNewTweet(tweet) {
  const last = await getLastId();
  const currentId = tweet?.id ?? tweet;
  return !last || last !== currentId;
}

module.exports = {
  setTweet,
  isNewTweet,
  getLastId, // utile pour debug
};
