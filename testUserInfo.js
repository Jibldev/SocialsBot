require("dotenv").config();
const { getUserInfo } = require("./src/services/twitterFetcher.js"); // Assure-toi que le chemin est correct

(async () => {
  const twitterUserId = "3855898996"; // Remplace par l’ID de ton choix
  const info = await getUserInfo(twitterUserId);

  if (info) {
    console.log("✅ Résultat :");
    console.log(`Nom complet : ${info.name}`);
    console.log(`Pseudo Twitter : @${info.username}`);
  } else {
    console.log("❌ Aucun utilisateur trouvé.");
  }
})();
