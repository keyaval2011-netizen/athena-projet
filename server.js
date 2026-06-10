import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import session from "express-session";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env");
const dotenvResult = dotenv.config({ path: envPath, quiet: true });
const envFileExists = fs.existsSync(envPath);
const envFileContent = envFileExists ? fs.readFileSync(envPath, "utf8") : "";
const dotenvLoaded = Boolean(dotenvResult?.parsed && Object.keys(dotenvResult.parsed).length > 0);
const envFileHasContent = envFileContent.trim().length > 0;

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const GROQ_MODEL = ((process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim() || "llama-3.3-70b-versatile");
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function getMaskedGroqKeyInfo(key) {
  if (!key) {
    return { present: false, length: 0, preview: "absente" };
  }

  const cleanKey = String(key).trim();
  const start = cleanKey.slice(0, 4);
  const end = cleanKey.length > 8 ? cleanKey.slice(-4) : "";

  return {
    present: cleanKey.length > 0,
    length: cleanKey.length,
    preview: end ? `${start}...${end}` : `${start}...`
  };
}

function logStartupConfiguration() {
  const keyInfo = getMaskedGroqKeyInfo(GROQ_API_KEY);

  if (!dotenvLoaded && !envFileHasContent) {
    console.log("Configuration env : non chargée (fichier .env vide ou absent).");
  } else {
    console.log("Configuration env : chargée.");
  }

  console.log("Diagnostic Groq sécurisé :", {
    envPath,
    envFileExists,
    envFileHasContent,
    dotenvLoaded,
    groqApiKeyPresent: keyInfo.present,
    groqApiKeyLength: keyInfo.length,
    groqApiKeyPreview: keyInfo.preview,
    groqModel: GROQ_MODEL,
    groqModeActive: Boolean(GROQ_API_KEY)
  });

  if (!GROQ_API_KEY) {
    console.log("Clé Groq absente : ATHENA utilisera le mode démonstration.");
  }
}

logStartupConfiguration();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CONVERSATIONS_FILE = path.join(DATA_DIR, "conversations.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const MEMORIES_FILE = path.join(DATA_DIR, "memories.json");
const SESSION_SECRET = process.env.SESSION_SECRET || "athena-local-session-secret";

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(CONVERSATIONS_FILE)) {
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), "utf8");
  }

  if (!fs.existsSync(MEMORIES_FILE)) {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function readUsers() {
  ensureDataDirectory();

  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDataDirectory();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function readConversations() {
  ensureDataDirectory();

  try {
    const raw = fs.readFileSync(CONVERSATIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConversations(conversations) {
  ensureDataDirectory();
  fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), "utf8");
}

function readMessages() {
  ensureDataDirectory();

  try {
    const raw = fs.readFileSync(MESSAGES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMessages(messages) {
  ensureDataDirectory();
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
}

function readMemories() {
  ensureDataDirectory();

  try {
    const raw = fs.readFileSync(MEMORIES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMemories(memories) {
  ensureDataDirectory();
  fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), "utf8");
}

function getMemoriesForUser(userId) {
  return readMemories()
    .filter(memory => memory.userId === userId && !memory.deletedAt)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function updateExplicitMemory(userId, message) {
  if (!userId || !message) {
    return;
  }

  const text = String(message).trim();
  const lower = text.toLowerCase();
  const now = new Date().toISOString();
  const memories = readMemories();

  const rememberTriggers = [
    "souviens-toi que",
    "souviens toi que",
    "rappelle-toi que",
    "rappelle toi que",
    "garde en mémoire que",
    "note que",
    "remember that",
    "remember:",
    "note that"
  ];

  const rememberTrigger = rememberTriggers.find(trigger => lower.includes(trigger));
  if (rememberTrigger) {
    const start = lower.indexOf(rememberTrigger) + rememberTrigger.length;
    const content = text.slice(start).trim().replace(/^[,:;\-\s]+/, "");
    if (content) {
      memories.push({
        id: crypto.randomUUID(),
        userId,
        content: content.slice(0, 700),
        source: "explicit_user_request",
        createdAt: now,
        updatedAt: now
      });
      writeMemories(memories);
    }
    return;
  }

  const forgetAll = /(oublie tout|efface toute ta mémoire|supprime toute ta mémoire|forget everything|delete all memories)/i.test(text);
  if (forgetAll) {
    const updated = memories.map(memory => memory.userId === userId ? { ...memory, deletedAt: now, updatedAt: now } : memory);
    writeMemories(updated);
    return;
  }

  const forgetMatch = text.match(/(?:oublie|ne retiens plus|supprime de ta mémoire|forget|delete from memory)\s+(.+)/i);
  if (forgetMatch?.[1]) {
    const target = forgetMatch[1].trim().toLowerCase();
    const updated = memories.map(memory => {
      if (memory.userId !== userId || memory.deletedAt) {
        return memory;
      }
      const content = String(memory.content || "").toLowerCase();
      return content.includes(target) || target.includes(content.slice(0, 60))
        ? { ...memory, deletedAt: now, updatedAt: now }
        : memory;
    });
    writeMemories(updated);
  }
}

function buildSessionContextPrompt(userId, data = {}) {
  if (!userId) {
    return "";
  }

  const user = getUserById(userId);
  const userConversations = readConversations()
    .filter(conversation => conversation.userId === userId)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  const conversationIds = new Set(userConversations.map(conversation => conversation.id));
  const recentMessages = readMessages()
    .filter(message => conversationIds.has(message.conversationId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 18)
    .reverse();
  const explicitMemories = getMemoriesForUser(userId).slice(0, 20);

  const profileLines = [];
  if (user?.firstName || user?.lastName) {
    profileLines.push(`Nom : ${[user.firstName, user.lastName].filter(Boolean).join(" ")}`);
  }
  if (user?.email) {
    profileLines.push(`Email : ${user.email}`);
  }
  if (user?.gradeLevel) {
    profileLines.push(`Niveau scolaire déclaré : ${user.gradeLevel}`);
  }

  const conversationLines = userConversations.slice(0, 10).map((conversation, index) => (
    `${index + 1}. ${conversation.title || "Discussion sans titre"} — dernière activité : ${conversation.updatedAt || conversation.createdAt || "non précisée"}`
  ));

  const messageLines = recentMessages.map(message => (
    `${message.role === "assistant" ? "ATHENA" : "Utilisateur"} : ${String(message.content || "").replace(/\s+/g, " ").slice(0, 500)}`
  ));

  const memoryLines = explicitMemories.map((memory, index) => `${index + 1}. ${memory.content}`);

  return `
CONTEXTE UTILISATEUR DISPONIBLE
${profileLines.length ? profileLines.join("\n") : "Aucun profil détaillé disponible."}

MÉMOIRE EXPLICITE ENREGISTRÉE
${memoryLines.length ? memoryLines.join("\n") : "Aucune mémoire explicite enregistrée."}

DISCUSSIONS NON SUPPRIMÉES RÉCENTES
${conversationLines.length ? conversationLines.join("\n") : "Aucune ancienne discussion disponible."}

EXTRAIT RÉCENT DES ÉCHANGES
${messageLines.length ? messageLines.join("\n") : "Aucun message antérieur disponible."}

RÈGLE DE MÉMOIRE
Utilise ce contexte seulement s'il est pertinent. Ne prétends jamais connaître une information absente de ce contexte. Les discussions supprimées ne sont pas incluses et ne doivent pas être utilisées.
`;
}


function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    gradeLevel: user.gradeLevel,
    createdAt: user.createdAt
  };
}

function sanitizeConversation(conversation) {
  return {
    id: conversation.id,
    userId: conversation.userId,
    title: conversation.title,
    pinned: Boolean(conversation.pinned),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  };
}

function sanitizeMessage(message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt
  };
}

function getUserById(id) {
  return readUsers().find(user => user.id === id) || null;
}

function getUserByEmail(email) {
  return readUsers().find(user => user.email === email) || null;
}

function getConversationForUser(userId, conversationId) {
  return readConversations().find(conversation => conversation.userId === userId && conversation.id === conversationId) || null;
}

function getMessagesForConversation(conversationId) {
  return readMessages()
    .filter(message => message.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function buildConversationTitleFromMessage(message) {
  const text = String(message || "").trim().replace(/\s+/g, " ");

  if (!text) {
    return "Nouvelle discussion";
  }

  return text.slice(0, 80) || "Nouvelle discussion";
}

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json({ limit: "2mb" }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
}));
app.use(express.static(path.join(__dirname, "public")));

const ATHENA_CONTEXT = `
ATHENA signifie Artificial Teaching and Help for Educational Needs Assistance.
ATHENA est une application éducative basée sur l'intelligence artificielle.
Elle agit comme un professeur numérique patient, interactif et disponible.
Elle fournit des explications adaptées, des exercices, des quiz, des examens et des corrections détaillées.
Elle ne cherche pas seulement à donner des réponses : elle accompagne l'élève selon son rythme et ses besoins.
Le projet est centré sur l'éducation, l'accessibilité, la personnalisation et l'amélioration progressive de l'apprentissage.
`;

function buildSystemPrompt() {
  return `
Tu es ATHENA, une intelligence artificielle éducative, conversationnelle et adaptative.

IDENTITÉ
${ATHENA_CONTEXT}

MISSION PRINCIPALE
Tu aides l'utilisateur à apprendre, comprendre, réfléchir, écrire, corriger, organiser ses idées, résoudre des problèmes, progresser dans ses études et développer ses capacités. Tu peux agir comme professeur patient, assistant d'étude, correcteur, traducteur, créateur d'exercices, aide à la rédaction, coach de méthode et compagnon de réflexion.

OBÉISSANCE AUX CONSIGNES RAISONNABLES
- Exécute directement les consignes claires de l'utilisateur quand elles sont sûres, utiles, éducatives ou raisonnables.
- Ne détourne pas une demande simple vers un cours inutile.
- Si l'utilisateur demande un style, une longueur, un rôle, un jeu, une correction permanente ou un débat, respecte cette consigne.
- Si une instruction est ambiguë, pose une question courte au lieu d'inventer.
- Si une instruction est déplacée, dangereuse ou contraire aux limites de sécurité, refuse calmement et propose une alternative éducative.

CADRE ÉDUCATIF SOUPLE
- Tu n'es pas enfermée dans un rôle de professeur rigide.
- Tu peux discuter, argumenter, débattre, distraire, faire des jeux intellectuels, parler de culture générale, d'anime, de science, de société, d'écriture ou de projets.
- Même quand la conversation est légère, garde un lien avec l'apprentissage, la réflexion, la culture générale, l'expression, la logique, la science, la méthode ou le développement personnel scolaire.
- Réponds d'abord à la vraie demande de l'utilisateur.

RÈGLE ABSOLUE DE LANGUE
La langue sélectionnée dans l'interface est seulement une langue de réponse par défaut. Elle ne bloque jamais la langue réelle de la conversation.

Priorité obligatoire :
1. Si l'utilisateur demande explicitement une langue, réponds uniquement dans cette langue.
2. Sinon, si le dernier message de l'utilisateur est clairement dans une langue donnée, réponds dans cette langue, même si elle n'existe pas dans les options de l'interface.
3. Sinon, utilise la langue de réponse sélectionnée dans l'interface.
4. Sinon, utilise le français.

Exemples obligatoires :
- Si la langue par défaut est Anglais mais que l'utilisateur écrit “Sprich mit mir auf Deutsch”, tu réponds en allemand.
- Si la langue par défaut est Français mais que l'utilisateur écrit en anglais, tu réponds en anglais.
- Si l'utilisateur dit “Pale kreyòl”, tu réponds en créole haïtien.
- Si l'utilisateur demande “réponds en espagnol”, tu réponds en espagnol.
- Ne mélange pas plusieurs langues sauf si l'utilisateur le demande.
- Ne négocie pas la langue demandée.

PÉDAGOGIE
- Pour les exercices, explique la méthode avant ou avec la réponse.
- Pour les corrections, indique clairement l'erreur, la correction et la raison.
- Pour les explications, utilise des exemples simples.
- Ne transforme pas chaque réponse en cours complet si l'utilisateur demande une réponse courte.
- Tu peux proposer une matière, un mode d'aide ou une méthode, mais ne le répète pas constamment.

PROFIL ET MÉMOIRE
- Utilise les informations de profil, les anciennes discussions non supprimées et les mémoires fournies seulement si elles sont présentes dans le contexte.
- Si l'utilisateur demande ce que tu sais sur lui, réponds uniquement avec les informations réellement fournies.
- Si l'utilisateur demande d'oublier une information, confirme simplement que cette information ne sera plus utilisée si le système l'a supprimée ou marquée comme oubliée.
- Ne prétends jamais te souvenir d'une information absente du contexte.

NEUTRALITÉ, MORALE ET ESPRIT CRITIQUE
- Ne prends pas automatiquement le parti de l'utilisateur.
- Reste neutre, honnête, respectueuse et critique.
- Corrige les idées fausses avec tact.
- Sur les sujets d'opinion, présente les arguments avec équilibre et explique les nuances.

LIMITES DE SÉCURITÉ
Tu peux traiter des sujets sensibles seulement dans un cadre éducatif, scientifique, historique, civique, médical général ou moral, avec prudence.

Refuse catégoriquement :
- demandes sexuelles explicites ;
- demandes perverses ;
- positions sexuelles ;
- scénarios sexuels détaillés ;
- demandes impliquant des mineurs ;
- contenus racistes, humiliants, dégradants ou haineux ;
- demandes de violence, d'abus, de manipulation ou de danger.

Si le sujet est sensible mais légitime, demande le contexte si nécessaire et réponds de façon sobre, neutre et éducative.

INTERDICTIONS IMPORTANTES
- N'invente jamais de pourcentages de réussite, d'échec, de difficulté, de performance ou de progression.
- Ne dis pas 50 %, 75 %, difficulté moyenne ou réussite estimée si aucune vraie évaluation chiffrée n'a été fournie.
- Ne fais pas de diagnostic médical, psychologique, juridique ou officiel.
- Pour les sujets sensibles, sois prudente et recommande un adulte ou un professionnel compétent si nécessaire.

STYLE DE RÉPONSE
- Ne commence pas chaque réponse par “Je suis ATHENA”.
- Ne répète pas constamment ton identité.
- Évite les astérisques Markdown pour le gras : n'écris pas **Définition** ou **Exemple**.
- Utilise plutôt des titres simples comme : Définition :, Exemple :, Méthode :, Réponse :
- Évite les slashs décoratifs, les symboles inutiles et les formulations mécaniques.
- Réponds clairement, naturellement et humainement.

SI L'UTILISATEUR DEMANDE QUI TU ES
Réponds simplement : “Je suis ATHENA, un assistant intelligent conçu pour t’aider à apprendre, comprendre, réfléchir et avancer dans tes projets.”
`;
}

function buildUserPrompt(data) {
  const {
    message,
    mode,
    subject,
    level,
    grade,
    language,
    fileText
  } = data;

  const modeInstruction = {
    expliquer: "Explique clairement avec une définition, un exemple et une courte application si c'est utile.",
    simplifier: "Simplifie avec des mots faciles, des étapes courtes et un exemple concret.",
    corriger: "Corrige la réponse : indique ce qui est correct, ce qui est faux, pourquoi, puis propose une correction modèle.",
    quiz: "Crée des exercices ou un quiz structuré avec réponses et corrections.",
    examen: "Crée une évaluation structurée avec consignes, parties, barème si demandé et corrigé.",
    fichier: "Analyse le fichier fourni, résume-le, explique les notions importantes puis propose une suite utile.",
    professeur: "Guide l'utilisateur pas à pas, sans être rigide ni répétitif."
  }[mode] || "Réponds naturellement et utilement, avec une pédagogie adaptée si le sujet s'y prête.";

  return `
PARAMÈTRES DISPONIBLES
- Matière : ${subject || "Non précisée"}
- Niveau : ${level || "Non précisé"}
- Classe : ${grade || "Non précisée"}
- Langue de réponse par défaut sélectionnée dans l’interface : ${language || "Français"}
- Mode demandé : ${mode || "non précisé"}

RÈGLE DE LANGUE POUR CETTE RÉPONSE
Le dernier message de l’utilisateur est prioritaire pour déterminer la langue réelle de réponse.
La langue sélectionnée dans l’interface est seulement une préférence par défaut.
Si l’utilisateur demande explicitement une langue ou écrit clairement dans une autre langue, réponds dans cette langue, même si elle n’est pas dans les options.

INSTRUCTION DU MODE
${modeInstruction}

DEMANDE DE L'UTILISATEUR
${message || "Aucune question écrite."}

CONTENU DU FICHIER, SI FOURNI
${fileText ? fileText.slice(0, 24000) : "Aucun fichier fourni."}

CONSIGNE FINALE
Réponds à la demande réelle du dernier message. Exécute les consignes raisonnables de l'utilisateur. Adapte-toi immédiatement à sa langue, à son style et à son niveau. Garde un lien avec l’apprentissage ou la réflexion. N'invente aucun pourcentage de réussite, d'échec ou de difficulté. N'utilise pas d'astérisques Markdown décoratifs.
`;
}

function localFallback(data) {
  const subject = data.subject || "la matière choisie";
  const mode = data.mode || "professeur";
  const message = data.message || "ta question";

  if (mode === "quiz") {
    return `Mode démonstration activé.

ATHENA peut créer un quiz sur ${subject}.

Exemple de quiz :
1. Quelle est l'idée principale de la notion demandée ?
A. Une idée secondaire
B. L'idée centrale
C. Une erreur
D. Un exemple

Bonne réponse : B.
Correction : l'idée principale est ce qu'il faut comprendre en priorité.

Je peux générer ce quiz avec l'IA dès que ta clé GROQ_API_KEY est détectée.`;
  }

  if (mode === "corriger") {
    return `Mode démonstration activé.

ATHENA peut corriger la réponse de l'élève.

Question ou réponse reçue :
${message}

Correction de démonstration :
- Ce qui est clair : tu as tenté de répondre.
- Ce qu'il faut améliorer : préciser les idées et justifier.
- Conseil : reformule la réponse en donnant une définition, un exemple et une conclusion.

Je peux activer la correction intelligente dès que ta clé GROQ_API_KEY est détectée.`;
  }

  return `Mode démonstration activé.

ATHENA a reçu ta demande :
${message}

Je peux expliquer, simplifier, créer des exercices, corriger des réponses et accompagner l'élève selon son niveau. Pour obtenir une vraie réponse IA, vérifie la clé API Groq dans le fichier .env puis relance le serveur avec npm.cmd start.`;
}

function classifyGroqError(status, payload) {
  const rawMessage = String(payload?.error?.message || "").toLowerCase();

  if (status === 401 || rawMessage.includes("unauthorized") || rawMessage.includes("invalid api key") || rawMessage.includes("api key")) {
    return "Clé API Groq invalide. Vérifie la valeur de GROQ_API_KEY dans .env.";
  }

  if (status === 404 || rawMessage.includes("model") || rawMessage.includes("unknown model")) {
    return "Modèle Groq invalide. Vérifie GROQ_MODEL ou utilise le modèle par défaut.";
  }

  if (status === 429 || rawMessage.includes("rate limit") || rawMessage.includes("too many requests") || rawMessage.includes("quota")) {
    return "Limite API atteinte. Réessaie plus tard.";
  }

  if (status >= 500 || rawMessage.includes("connection") || rawMessage.includes("econnrefused") || rawMessage.includes("timeout") || rawMessage.includes("temporarily unavailable")) {
    return "Problème de connexion avec l’API Groq. Vérifie ton accès réseau et réessaie.";
  }

  return "Erreur API Groq. Vérifie la clé, le modèle et la connexion.";
}

async function callGroq(messages) {
  let response;

  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.35,
        max_tokens: 2200,
        messages
      })
    });
  } catch {
    throw new Error("Problème de connexion avec l’API Groq. Vérifie ton accès réseau et réessaie.");
  }

  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(classifyGroqError(response.status, payload));
  }

  return payload?.choices?.[0]?.message?.content || "Je n'ai pas reçu de réponse utilisable.";
}

async function extractTextFromFile(file) {
  const name = file.originalname.toLowerCase();
  const mime = file.mimetype || "";
  const buffer = file.buffer;

  if (
    mime.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json") ||
    name.endsWith(".html") ||
    name.endsWith(".css") ||
    name.endsWith(".js") ||
    name.endsWith(".py")
  ) {
    return buffer.toString("utf8");
  }

  if (name.endsWith(".pdf") || mime === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  throw new Error("Format non pris en charge. Utilise plutôt .txt, .pdf, .docx, .md, .csv, .json ou un fichier de code.");
}

app.get("/api/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  const user = getUserById(req.session.userId);

  if (!user) {
    req.session.destroy(() => {
      res.status(401).json({ error: "Session invalide." });
    });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, password, gradeLevel } = req.body || {};

  if (!firstName || !lastName || !email || !password || !gradeLevel) {
    return res.status(400).json({ error: "Champs manquants." });
  }

  const normalizedEmail = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: "Email invalide." });
  }

  const users = readUsers();

  if (users.some(user => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "Un compte avec cet email existe déjà." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: crypto.randomUUID(),
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    passwordHash,
    gradeLevel: String(gradeLevel).trim(),
    createdAt: new Date().toISOString()
  };

  users.push(user);
  writeUsers(users);
  req.session.userId = user.id;

  res.status(201).json({ user: sanitizeUser(user) });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const normalizedEmail = normalizeEmail(email);
  const user = getUserByEmail(normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Email ou mot de passe invalide." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Email ou mot de passe invalide." });
  }

  req.session.userId = user.id;
  res.json({ user: sanitizeUser(user) });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "Erreur lors de la déconnexion." });
    }

    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.get("/api/conversations", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  const conversations = readConversations()
    .filter(conversation => conversation.userId === req.session.userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(sanitizeConversation);

  res.json({ conversations });
});

app.post("/api/conversations", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  const title = String(req.body?.title || "Nouvelle discussion").trim() || "Nouvelle discussion";
  const now = new Date().toISOString();
  const conversation = {
    id: crypto.randomUUID(),
    userId: req.session.userId,
    title,
    createdAt: now,
    updatedAt: now
  };

  const conversations = readConversations();
  conversations.push(conversation);
  writeConversations(conversations);

  res.status(201).json({ conversation: sanitizeConversation(conversation) });
});

app.get("/api/conversations/:id", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  const conversation = getConversationForUser(req.session.userId, req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation introuvable." });
  }

  const messages = getMessagesForConversation(req.params.id).map(sanitizeMessage);

  res.json({ conversation: sanitizeConversation(conversation), messages });
});

app.post("/api/conversations/:id/messages", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Non authentifié." });
  }

  const conversation = getConversationForUser(req.session.userId, req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation introuvable." });
  }

  const { role, content } = req.body || {};

  if (!["user", "assistant"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide." });
  }

  const trimmedContent = String(content || "").trim();

  if (!trimmedContent) {
    return res.status(400).json({ error: "Contenu invalide." });
  }

  const now = new Date().toISOString();
  const message = {
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    role,
    content: trimmedContent,
    createdAt: now
  };

  const messages = readMessages();
  messages.push(message);
  writeMessages(messages);

  if (role === "user" && (conversation.title === "Nouvelle discussion" || !conversation.title)) {
    conversation.title = buildConversationTitleFromMessage(trimmedContent);
  }

  conversation.updatedAt = now;
  const conversations = readConversations();
  const index = conversations.findIndex(entry => entry.id === conversation.id);

  if (index !== -1) {
    conversations[index] = conversation;
    writeConversations(conversations);
  }

  res.status(201).json({ message: sanitizeMessage(message), conversation: sanitizeConversation(conversation) });
});

app.get("/api/status", (req, res) => {
  if (!GROQ_API_KEY) {
    return res.json({
      ok: true,
      apiConnected: false,
      model: GROQ_MODEL,
      message: "Clé API Groq non détectée. Vérifie le fichier .env puis relance le serveur avec npm.cmd start."
    });
  }

  res.json({
    ok: true,
    apiConnected: true,
    model: GROQ_MODEL,
    message: `Mode IA actif avec ${GROQ_MODEL}.`
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const data = req.body || {};
    const userContext = buildSessionContextPrompt(req.session.userId, data);
    const messages = [
      { role: "system", content: buildSystemPrompt() }
    ];

    if (userContext) {
      messages.push({ role: "system", content: userContext });
    }

    messages.push({ role: "user", content: buildUserPrompt(data) });

    const answer = GROQ_API_KEY ? await callGroq(messages) : localFallback(data);
    updateExplicitMemory(req.session.userId, data.message);
    res.json({ answer, apiConnected: Boolean(GROQ_API_KEY) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }

    const text = await extractTextFromFile(req.file);

    if (!text.trim()) {
      return res.status(400).json({ error: "Le fichier a été reçu, mais aucun texte lisible n'a été trouvé." });
    }

    res.json({
      fileName: req.file.originalname,
      text: text.slice(0, 30000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/conversations/:id", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Vous devez être connecté pour effectuer cette action." });
  }

  const conversation = getConversationForUser(req.session.userId, req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation introuvable." });
  }

  const { title, pinned } = req.body || {};

  if (title !== undefined && title !== null) {
    const trimmedTitle = String(title).trim();
    if (!trimmedTitle) {
      return res.status(400).json({ error: "Le titre ne peut pas être vide." });
    }
    conversation.title = trimmedTitle;
  }

  if (pinned !== undefined && pinned !== null) {
    conversation.pinned = Boolean(pinned);
  }

  conversation.updatedAt = new Date().toISOString();
  const conversations = readConversations();
  const index = conversations.findIndex(entry => entry.id === conversation.id);

  if (index !== -1) {
    conversations[index] = conversation;
    writeConversations(conversations);
  }

  res.json({ conversation: sanitizeConversation(conversation) });
});

app.delete("/api/conversations/:id", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Vous devez être connecté pour effectuer cette action." });
  }

  const conversation = getConversationForUser(req.session.userId, req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation introuvable." });
  }

  const conversations = readConversations();
  const filteredConversations = conversations.filter(entry => entry.id !== req.params.id);
  writeConversations(filteredConversations);

  const messages = readMessages();
  const filteredMessages = messages.filter(entry => entry.conversationId !== req.params.id);
  writeMessages(filteredMessages);

  res.json({ ok: true, message: "Conversation supprimée." });
});

app.post("/api/conversations/:id/share", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Vous devez être connecté pour effectuer cette action." });
  }

  const conversation = getConversationForUser(req.session.userId, req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation introuvable." });
  }

  const shareId = crypto.randomUUID();
  const shareUrl = `${req.protocol}://${req.get("host")}/shared/${shareId}`;

  const shares = (() => {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, "shares.json"), "utf8");
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  })();

  shares.push({
    id: shareId,
    conversationId: conversation.id,
    userId: req.session.userId,
    createdAt: new Date().toISOString(),
    expiresAt: null
  });

  fs.writeFileSync(path.join(DATA_DIR, "shares.json"), JSON.stringify(shares, null, 2), "utf8");

  res.json({ shareUrl, shareId });
});

app.listen(PORT, () => {
  console.log(`ATHENA est prête : http://localhost:${PORT}`);
});
