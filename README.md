# ATHENA — Application éducative intelligente

Ce projet est une reconstruction propre d'ATHENA, basée sur la présentation ExpoSciences.

## Contenu

- Page d'accueil
- Page Découvrir ATHENA
- Page Fonctionnalités
- Page Confidentialité et limites
- Modales : connexion, création de compte, mot de passe oublié
- Interface principale ATHENA
- Modes : expliquer, simplifier, corriger, quiz, examen, fichier, professeur particulier
- Import de fichiers : .txt, .md, .csv, .json, .html, .css, .js, .py, .pdf, .docx
- API Groq protégée côté serveur

## Installation

1. Ouvre le dossier dans Visual Studio Code.
2. Ouvre le terminal dans VS Code.
3. Installe Node.js si ce n'est pas déjà fait.
4. Lance :

```bash
npm install
```

5. Copie `.env.example` et renomme la copie en `.env`.

6. Mets ta clé Groq dans `.env` :

```env
GROQ_API_KEY=ta_cle_ici
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
```

7. Lance ATHENA :

```bash
npm start
```

8. Ouvre dans ton navigateur :

```text
http://localhost:3000
```

## Sécurité

Ne mets jamais la clé API dans `index.html`, `style.css` ou `app.js`.
La clé doit rester dans `.env`.
