# 📢 Twitter-to-Discord Bot

Ce bot Discord surveille un ou plusieurs comptes Twitter, et publie automatiquement leurs nouveaux tweets dans un salon Discord défini.

---

## ✨ Fonctionnalités

- 🔁 Vérifie toutes les 15 minutes s’il y a de nouveaux tweets
- 🧠 Ignore les doublons grâce à un historique local
- 🏷️ Affiche proprement le nom du compte Twitter (`@username`)
- ✅ Configurable via des variables d'environnement
- 📦 Compatible avec Render, GitHub, et exécutable en local

---

## 🛠️ Installation

### 1. Clone du projet

```bash
git clone https://github.com/ton-compte/ton-repo.git
cd ton-repo
```

### 2. Installation des dépendances

```bash
npm install
```

### 3. Configuration `.env`

Crée un fichier `.env` (non poussé) :

```env
DISCORD_TOKEN=xxxxxxxxxxxxxxxxxxxx
DISCORD_CHANNEL_ID=123456789012345678

TWITTER_BEARER_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyy
TWITTER_USER_ID=111111111111111111
TWITTER_USER_ID_1=222222222222222222
TWITTER_USER_ID_2=333333333333333333
```

Tu peux ajouter autant de `TWITTER_USER_ID_X` que nécessaire.

---

## 🚀 Lancement

### En local :

```bash
node src/index.js
```

### Sur Render :

- Déploie via GitHub
- Ajoute les variables `.env` dans Render > Environment
- Utilise cette commande dans "Start Command" :
  ```bash
  node src/index.js
  ```

---

## 🧪 Utilitaire : Récupérer l'ID d'un compte Twitter

Utilise ce script pour convertir un `@username` en ID numérique :

```bash
node src/services/getUserId.js Spideraxe30
```

Affichera :

```
✅ ID de @Spideraxe30 : 3855898996
```

---

## 🧠 Notes

- Le bot utilise l’API Twitter v2 (avec Bearer Token)
- Le tweet est ignoré s’il a déjà été posté
- Si un compte ne publie que des vidéos, Discord peut ne pas afficher d’aperçu

---

## 📄 Licence

Ce projet est sous licence MIT.
