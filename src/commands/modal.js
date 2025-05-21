const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events,
} = require("discord.js");
const { getTweet } = require("../utils/tweetCache");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("compose")
    .setDescription("Créer un message tweet modifiable avant envoi"),

  async execute(interaction) {
    // Récupère le dernier tweet depuis le cache
    const tweet = getTweet();

    if (!tweet || !tweet.url) {
      return await interaction.reply({
        content:
          "❌ Aucun tweet en cache. Attends la prochaine mise à jour automatique.",
        ephemeral: true,
      });
    }

    const clean = (str) => str.normalize("NFKC").replace(/^[ \t]+/gm, "");
    const characterName = tweet.text?.split("-")[0].trim() || "???";
    const roleId = "112233445566778899";

    const rawMessage = `<@&${roleId}>
# 📢 New tweet !
## 👑 ${characterName}
Open the link to **like** and **repost**:
- ${tweet.url}
- *Share and follow for more*`;

    const defaultMessage = clean(rawMessage);

    const input = new TextInputBuilder()
      .setCustomId("tweetContent")
      .setLabel("Contenu du message à publier")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setValue(defaultMessage)
      .setMaxLength(2000);

    const row = new ActionRowBuilder().addComponents(input);
    const modal = new ModalBuilder()
      .setCustomId("tweetComposer")
      .setTitle("Composer un tweet Discord")
      .addComponents(row);

    await interaction.showModal(modal);
  },

  async modalResponse(interaction) {
    const content = interaction.fields.getTextInputValue("tweetContent");

    try {
      await interaction.reply({ content, ephemeral: false });
    } catch (err) {
      console.error("Erreur lors de l'envoi du message :", err);
      await interaction.reply({
        content: "❌ Erreur lors de l'envoi du message.",
        ephemeral: true,
      });
    }
  },
};
