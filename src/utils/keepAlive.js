const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Render impose le port via une variable d'env
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 KeepAlive server ready on port ${PORT}`);
});
