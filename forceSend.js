require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const {
  getLatestTweet,
  getUserInfo,
} = require("./src/services/twitterFetcher.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

(async () => {
  await client.login(process.env.DISCORD_TOKEN);
  await client.once("ready", async () => {
    const twitterUserId = "3855898996"; // change si besoin
    const tweet = await getLatestTweet(twitterUserId);
    const user = await getUserInfo(twitterUserId);

    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    await channel.send(`📢 Nouveau tweet de **${user.name}** !\n${tweet.url}`);

    console.log("✅ Message envoyé.");
    process.exit();
  });
})();
