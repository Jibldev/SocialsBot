const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot actif!");
});

// ✅ Obligatoire sur Render : utiliser le port imposé par l'environnement
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Serveur HTTP actif sur le port ${PORT}`);
});
