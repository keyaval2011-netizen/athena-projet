let importedFileText = "";
let heroCarouselTimer = null;
let history = JSON.parse(localStorage.getItem("athena_history") || "[]");
let currentUser = null;
let currentConversation = null;
let currentConversationId = null;
let currentConversationMessages = [];
let conversations = [];
let activeConversationMenuId = null;
let speechRecognizer = null;
let voiceRecognition = null;
let voiceMode = null; // 'dictation' or 'chat'
let voiceTranscript = "";
let voiceInterim = "";
let voiceChatTranscript = "";
let voiceChatInterim = "";
let voiceChatActive = false;
let voiceChatShouldRestart = false;
let voiceChatSilenceTimer = null;
let voiceTranslationTimer = null;
let voiceChatTranslationTimer = null;
let lastVoiceDictationRecognized = "";
let lastVoiceChatRecognized = "";
let lastVoiceDictationTranslated = "";
let lastVoiceChatTranslated = "";
let athenaIsSpeaking = false;
let currentAthenaAudio = null;
let availableVoices = [];
let nextAssistantSpeech = false;
let currentWelcomeSubtitle = null;
const DEFAULT_LANGUAGE_STORAGE_KEY = "athena_default_response_language";
const LANGUAGE_CODE_MAP = Object.freeze({
  "Français": "fr-FR",
  "Anglais": "en-US",
  "Espagnol": "es-ES",
  "Chinois": "zh-CN",
  "Mandarin": "zh-CN",
  "Hindi": "hi-IN",
  "Arabe": "ar-SA",
  "Bengali": "bn-BD",
  "Russe": "ru-RU",
  "Portugais": "pt-BR",
  "Ourdou": "ur-PK",
  "Créole haïtien": "ht-HT"
});
const LANGUAGE_NAME_BY_CODE = Object.freeze({
  "fr-FR": "Français",
  "en-US": "Anglais",
  "es-ES": "Espagnol",
  "zh-CN": "Chinois",
  "hi-IN": "Hindi",
  "ar-SA": "Arabe",
  "bn-BD": "Bengali",
  "ru-RU": "Russe",
  "pt-BR": "Portugais",
  "ur-PK": "Ourdou",
  "ht-HT": "Créole haïtien"
});
const welcomeSubtitles = [
  {
    display: "Bonjour, que puis-je faire pour vous aujourd’hui ?",
    voice: {
      "Français": "Bonjour, que puis-je faire pour vous aujourd’hui ?",
      "Anglais": "Hello, how can I help you today?",
      "Espagnol": "Hola, ¿en qué puedo ayudarte hoy?",
      "Chinois": "你好，今天我能为你做什么？",
      "Hindi": "नमस्ते, आज मैं आपकी कैसे मदद कर सकती हूँ?",
      "Arabe": "مرحبًا، كيف يمكنني مساعدتك اليوم؟",
      "Bengali": "হ্যালো, আজ আমি কীভাবে তোমাকে সাহায্য করতে পারি?",
      "Russe": "Здравствуйте, чем я могу помочь вам сегодня?",
      "Portugais": "Olá, como posso ajudar você hoje?",
      "Ourdou": "سلام، آج میں آپ کی کیسے مدد کر سکتی ہوں؟",
      "Créole haïtien": "Bonjou, kijan mwen ka ede w jodi a?"
    }
  },
  {
    display: "Écris ta demande, je t’accompagne étape par étape.",
    voice: {
      "Français": "Écris ta demande, je t’accompagne étape par étape.",
      "Anglais": "Write your request, and I will guide you step by step.",
      "Espagnol": "Escribe tu solicitud y te acompañaré paso a paso.",
      "Chinois": "写下你的请求，我会一步一步帮助你。",
      "Hindi": "अपना अनुरोध लिखिए, मैं आपको चरण दर चरण मार्गदर्शन दूँगी।",
      "Arabe": "اكتب طلبك، وسأرافقك خطوة بخطوة.",
      "Bengali": "তোমার অনুরোধ লিখো, আমি ধাপে ধাপে তোমাকে সাহায্য করব।",
      "Russe": "Напишите ваш запрос, и я помогу вам шаг за шагом.",
      "Portugais": "Escreva seu pedido, e eu vou acompanhar você passo a passo.",
      "Ourdou": "اپنی درخواست لکھیں، میں قدم بہ قدم آپ کی رہنمائی کروں گی۔",
      "Créole haïtien": "Ekri demann ou an, m ap akonpaye w etap pa etap."
    }
  },
  {
    display: "Pose ta question, ou choisis une aide selon ton besoin.",
    voice: {
      "Français": "Pose ta question, ou choisis une aide selon ton besoin.",
      "Anglais": "Ask your question, or choose the help you need.",
      "Espagnol": "Haz tu pregunta o elige la ayuda que necesitas.",
      "Chinois": "提出你的问题，或选择你需要的帮助。",
      "Hindi": "अपना प्रश्न पूछिए या अपनी ज़रूरत के अनुसार सहायता चुनिए।",
      "Arabe": "اطرح سؤالك أو اختر نوع المساعدة التي تحتاجها.",
      "Bengali": "তোমার প্রশ্ন করো, অথবা প্রয়োজনীয় সহায়তা বেছে নাও।",
      "Russe": "Задайте вопрос или выберите нужный вид помощи.",
      "Portugais": "Faça sua pergunta ou escolha o tipo de ajuda de que precisa.",
      "Ourdou": "اپنا سوال پوچھیں یا اپنی ضرورت کے مطابق مدد منتخب کریں۔",
      "Créole haïtien": "Poze kesyon ou, oswa chwazi èd ou bezwen an."
    }
  },
  {
    display: "Nouvelle discussion ouverte. Quel est le programme ?",
    voice: {
      "Français": "Nouvelle discussion ouverte. Quel est le programme ?",
      "Anglais": "New conversation opened. What is the plan?",
      "Espagnol": "Nueva conversación abierta. ¿Cuál es el plan?",
      "Chinois": "新的对话已开始。今天的计划是什么？",
      "Hindi": "नई बातचीत शुरू हो गई है। आज की योजना क्या है?",
      "Arabe": "تم فتح محادثة جديدة. ما الخطة؟",
      "Bengali": "নতুন আলোচনা শুরু হয়েছে। পরিকল্পনা কী?",
      "Russe": "Новый разговор открыт. Какой план?",
      "Portugais": "Nova conversa aberta. Qual é o plano?",
      "Ourdou": "نئی گفتگو شروع ہو گئی ہے۔ منصوبہ کیا ہے؟",
      "Créole haïtien": "Nouvo diskisyon ouvè. Ki pwogram nan?"
    }
  },
  {
    display: "Ravi de vous retrouver. Que souhaitez-vous faire ?",
    voice: {
      "Français": "Ravi de vous retrouver. Que souhaitez-vous faire ?",
      "Anglais": "Glad to see you again. What would you like to do?",
      "Espagnol": "Me alegra verte de nuevo. ¿Qué te gustaría hacer?",
      "Chinois": "很高兴再次见到你。你想做什么？",
      "Hindi": "आपसे फिर मिलकर खुशी हुई। आप क्या करना चाहेंगे?",
      "Arabe": "سعيد برؤيتك من جديد. ماذا تريد أن تفعل؟",
      "Bengali": "তোমাকে আবার দেখে ভালো লাগছে। তুমি কী করতে চাও?",
      "Russe": "Рад снова вас видеть. Что вы хотите сделать?",
      "Portugais": "Fico feliz em ver você novamente. O que você gostaria de fazer?",
      "Ourdou": "آپ سے دوبارہ مل کر خوشی ہوئی۔ آپ کیا کرنا چاہتے ہیں؟",
      "Créole haïtien": "Mwen kontan wè w ankò. Kisa ou ta renmen fè?"
    }
  }
];

function setWelcomeSubtitle() {
  currentWelcomeSubtitle = welcomeSubtitles[Math.floor(Math.random() * welcomeSubtitles.length)];
  const paragraph = document.querySelector('.welcome p');
  if (paragraph && currentWelcomeSubtitle) {
    paragraph.textContent = currentWelcomeSubtitle.display;
  }
}

function toggleComposerMenu(force) {
  const menu = document.getElementById('composerMenu');
  if (!menu) {
    return;
  }

  if (typeof force === 'boolean') {
    menu.classList.toggle('hidden', !force);
    return;
  }

  menu.classList.toggle('hidden');
}

function getSelectedLanguageName(languageValue = document.getElementById('language')?.value || 'Français') {
  const rawValue = String(languageValue || 'Français').trim();
  if (LANGUAGE_CODE_MAP[rawValue]) {
    return rawValue;
  }

  const lowerValue = rawValue.toLowerCase();
  const codeMatch = Object.entries(LANGUAGE_NAME_BY_CODE).find(([code]) => code.toLowerCase() === lowerValue);
  if (codeMatch) {
    return codeMatch[1];
  }

  const nameMatch = Object.keys(LANGUAGE_CODE_MAP).find((name) => name.toLowerCase() === lowerValue);
  if (nameMatch) {
    return nameMatch;
  }

  return 'Français';
}

function getSelectedResponseLanguageName() {
  const languageSelect = document.getElementById('language');
  return getSelectedLanguageName(languageSelect?.value || 'Français');
}

function restoreDefaultResponseLanguage() {
  const languageSelect = document.getElementById('language');

  if (!languageSelect) {
    return;
  }

  const savedLanguage = localStorage.getItem(DEFAULT_LANGUAGE_STORAGE_KEY);

  if (!savedLanguage) {
    return;
  }

  const matchingOption = Array.from(languageSelect.options).find((option) => option.value === savedLanguage || option.textContent === savedLanguage);

  if (matchingOption) {
    languageSelect.value = matchingOption.value;
  }
}

function bindDefaultResponseLanguagePersistence() {
  const languageSelect = document.getElementById('language');

  if (!languageSelect) {
    return;
  }

  languageSelect.addEventListener('change', () => {
    localStorage.setItem(DEFAULT_LANGUAGE_STORAGE_KEY, languageSelect.value || 'Français');
  });
}

function getSpeechRecognitionLanguage() {
  const browserLang = (navigator.language || navigator.userLanguage || 'fr-FR').toLowerCase();
  if (browserLang.startsWith('en')) {
    return 'en-US';
  }
  if (browserLang.startsWith('es')) {
    return 'es-ES';
  }
  return 'fr-FR';
}

const SUPPORTED_TTS_LANGUAGES = new Set(['Français', 'Anglais', 'Espagnol', 'Chinois', 'Russe', 'Portugais', 'Hindi']);

function isSupportedSpeechLanguage(languageValue = document.getElementById('language')?.value || 'Français') {
  return SUPPORTED_TTS_LANGUAGES.has(getSelectedLanguageName(languageValue));
}

function canSpeakSelectedResponseLanguage(languageValue = document.getElementById('language')?.value || 'Français') {
  if (!window.speechSynthesis || !availableVoices.length) {
    return false;
  }
  const selectedLanguageName = getSelectedLanguageName(languageValue);
  if (!isSupportedSpeechLanguage(selectedLanguageName)) {
    return false;
  }
  return Boolean(getAthenaVoice(languageValue));
}

function getSpeechLanguage(languageValue = document.getElementById('language')?.value || 'Français') {
  const languageName = getSelectedLanguageName(languageValue);
  return LANGUAGE_CODE_MAP[languageName] || LANGUAGE_CODE_MAP['Français'];
}

function getAthenaVoice(languageValue = document.getElementById('language')?.value || 'Français') {
  const selectedLanguageName = getSelectedLanguageName(languageValue);
  const lang = getSpeechLanguage(languageValue);
  const normalizedLang = lang.toLowerCase();
  const exact = availableVoices.find((voice) => voice.lang.toLowerCase() === normalizedLang);
  const partial = availableVoices.find((voice) => voice.lang.toLowerCase().startsWith(normalizedLang.split('-')[0]));

  if (selectedLanguageName === 'Créole haïtien') {
    if (exact) {
      return exact;
    }
    const frenchVoices = availableVoices.filter((voice) => voice.lang.toLowerCase() === 'fr-fr');
    const frenchFemale = frenchVoices.find((voice) => /female|femme|feminin|daughter|alloy|samantha|victoria|amelia|linda/i.test(voice.name));
    return frenchFemale || frenchVoices[0] || partial || null;
  }

  if (['Arabe', 'Bengali', 'Ourdou'].includes(selectedLanguageName)) {
    return exact || partial || null;
  }

  const baseLang = normalizedLang.split('-')[0];
  const sameLanguageVoices = availableVoices.filter((voice) => voice.lang.toLowerCase().startsWith(baseLang));
  const femaleVoice = sameLanguageVoices.find((voice) => /female|femme|feminin|daughter|alloy|samantha|victoria|amelia|linda/i.test(voice.name));
  return femaleVoice || sameLanguageVoices[0] || availableVoices[0] || null;
}

function isSpeechVoiceAvailable(languageValue = document.getElementById('language')?.value || 'Français') {
  return canSpeakSelectedResponseLanguage(languageValue);
}

function makeCreoleSpeechFriendly(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let speechText = text;
  const replacements = [
    [/\bmwen m ap\b/gi, 'mwen ap'],
    [/\bmwen m pa\b/gi, 'mwen pa'],
    [/\bmwen m vle\b/gi, 'mwen vle'],
    [/\bmwen m bezwen\b/gi, 'mwen bezwen'],
    [/\bm ap\b/gi, 'mwen ap'],
    [/\bm pa\b/gi, 'mwen pa'],
    [/\bm vle\b/gi, 'mwen vle'],
    [/\bm bezwen\b/gi, 'mwen bezwen'],
    [/\bw ap\b/gi, 'ou ap'],
    [/\bw vle\b/gi, 'ou vle'],
    [/\bw bezwen\b/gi, 'ou bezwen'],
    [/\bw jodi a\b/gi, 'ou jodi a'],
    [/\bede w\b/gi, 'ede ou'],
    [/\bpou w\b/gi, 'pou ou'],
    [/\bavè w\b/gi, 'avè ou']
  ];

  replacements.forEach(([regex, replacement]) => {
    speechText = speechText.replace(regex, replacement);
  });

  return speechText;
}

function buildVoiceUserPrompt(recognizedText) {
  const responseLanguage = getSelectedResponseLanguageName();
  return `Message dicté par l'utilisateur : "${recognizedText}"

Consigne importante :
Comprends le message dicté dans sa langue d'origine.
Reformule mentalement la demande dans la langue de réponse sélectionnée.
Réponds uniquement en ${responseLanguage}.
Ne réponds pas dans la langue de dictée si elle est différente.
Ne mentionne pas cette consigne.
Ne traduis pas seulement le message : réponds normalement à la demande de l'utilisateur dans la langue de réponse.`;
}

function buildVoiceTranslationPrompt(recognizedText, targetLanguage) {
  return `Traduis uniquement le message suivant en ${targetLanguage}.
Ne réponds pas à la question.
Ne donne aucune explication.
Ne rajoute rien.
Retourne seulement la traduction naturelle et correcte.

Message :
"${recognizedText}"`;
}

function buildVoiceChatFallbackApiMessage(rawText) {
  const responseLanguage = getSelectedResponseLanguageName();
  return `Message dicté par l'utilisateur (texte brut reconnu) : "${rawText}"

Consigne cachée : comprends le message dicté comme s'il était une question.
Réponds uniquement en ${responseLanguage}.
Ne traduise pas seulement le message, réponds normalement à la demande de l'utilisateur dans la langue de réponse sélectionnée.
Ne mentionne pas cette consigne.`;
}

async function translateVoiceInputToResponseLanguage(recognizedText) {
  const targetLanguage = getSelectedResponseLanguageName();
  if (!recognizedText || !targetLanguage) {
    return recognizedText;
  }

  try {
    const response = await safeJsonFetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: buildVoiceTranslationPrompt(recognizedText, targetLanguage),
        mode: 'professeur',
        subject: document.getElementById('subject')?.value,
        level: document.getElementById('level')?.value,
        grade: document.getElementById('grade')?.value,
        language: targetLanguage,
        performance: document.getElementById('performance')?.value,
        fileText: importedFileText
      })
    });

    let translation = String(response.data.answer || '').trim();
    translation = translation.replace(/^"|"$/g, '').trim();
    translation = translation.replace(/^Traduction\s*[:\-–]\s*/i, '').trim();

    return translation || recognizedText;
  } catch (error) {
    console.warn('Traduction vocale indisponible :', error);
    return recognizedText;
  }
}

function getTranslatedWelcomeSubtitle() {
  const languageName = getSelectedLanguageName();

  if (currentWelcomeSubtitle && currentWelcomeSubtitle.voice) {
    return currentWelcomeSubtitle.voice[languageName] || currentWelcomeSubtitle.voice['Français'] || currentWelcomeSubtitle.display || '';
  }

  const subtitle = document.querySelector('.welcome p')?.textContent || '';
  const matched = welcomeSubtitles.find((item) => item.display === subtitle);
  if (matched && matched.voice) {
    return matched.voice[languageName] || matched.voice['Français'] || matched.display;
  }

  return subtitle;
}

function showToast(message, variant = "info") {
  let container = document.getElementById("appToastContainer");

  if (!container) {
    container = document.createElement("div");
    container.id = "appToastContainer";
    container.className = "app-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `app-toast ${variant}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("visible");
    toast.classList.add("hiding");
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
}

async function safeJsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const raw = await response.text();
    const message = raw && raw.includes("<!DOCTYPE html>")
      ? "Le serveur a renvoyé une page HTML au lieu d’un JSON API. Vérifie la route et l’URL."
      : `La réponse du serveur n’est pas au format JSON (statut ${response.status}).`;

    throw new Error(message);
  }

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    throw new Error("La réponse du serveur n’est pas un JSON valide.");
  }

  return { response, data };
}

function loadAthenaVoices() {
  if (!window.speechSynthesis) {
    availableVoices = [];
    return;
  }

  availableVoices = window.speechSynthesis.getVoices();
  if (!availableVoices.length) {
    window.speechSynthesis.onvoiceschanged = () => {
      availableVoices = window.speechSynthesis.getVoices();
    };
  }
}

function speakWithBrowserSynthesis(text, onEnd = null) {
  if (!window.speechSynthesis) {
    if (typeof onEnd === 'function') {
      onEnd();
    }
    return false;
  }

  const selectedLanguage = document.getElementById('language')?.value || 'Français';
  const selectedLanguageName = getSelectedLanguageName(selectedLanguage);

  if (!isSupportedSpeechLanguage(selectedLanguageName)) {
    if (typeof onEnd === 'function') {
      onEnd();
    }
    return false;
  }

  const speechLang = getSpeechLanguage(selectedLanguage);
  const voice = getAthenaVoice(selectedLanguage);

  if (!voice) {
    if (typeof onEnd === 'function') {
      onEnd();
    }
    return false;
  }

  let utteranceText = text;
  if (selectedLanguageName === 'Créole haïtien') {
    utteranceText = makeCreoleSpeechFriendly(text);
  }

  const utterance = new SpeechSynthesisUtterance(utteranceText);
  utterance.voice = voice;

  utterance.lang = selectedLanguageName === 'Créole haïtien' && voice?.lang?.toLowerCase() === 'fr-fr' ? 'fr-FR' : speechLang;
  console.log('ATHENA voice language', {
    selectedLanguage,
    selectedLanguageName,
    speechLang,
    voiceName: voice?.name || 'fallback',
    voiceLang: voice?.lang || 'fallback'
  });

  utterance.onend = () => {
    if (typeof onEnd === 'function') {
      onEnd();
    }
  };
  utterance.onerror = () => {
    if (typeof onEnd === 'function') {
      onEnd();
    }
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

function cancelAthenaSpeech() {
  if (currentAthenaAudio) {
    currentAthenaAudio.pause();
    currentAthenaAudio = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  athenaIsSpeaking = false;
}

async function speakAthenaText(text, onEnd = null) {
  if (!text || !text.trim()) {
    if (typeof onEnd === 'function') {
      onEnd();
    }
    return;
  }

  cancelAthenaSpeech();
  speakWithBrowserSynthesis(text, onEnd);
}

function updateVoicePanel(status, transcript = '') {
  const panel = document.getElementById('voicePanel');
  const statusNode = document.getElementById('voiceStatus');
  const preview = document.getElementById('voicePreview');
  if (!panel || !statusNode || !preview) {
    return;
  }

  panel.classList.remove('hidden');
  statusNode.textContent = status;
  preview.textContent = transcript || 'Aucun texte reconnu pour l’instant.';
}

function hideVoicePanel() {
  const panel = document.getElementById('voicePanel');
  if (panel) {
    panel.classList.add('hidden');
  }
}

function updateVoiceChatPanel(status, transcript = '') {
  const panel = document.getElementById('voiceChatPanel');
  const statusNode = document.getElementById('voiceChatStatus');
  const preview = document.getElementById('voiceChatPreview');
  if (!panel || !statusNode || !preview) {
    return;
  }

  panel.classList.remove('hidden');
  statusNode.textContent = status;
  preview.textContent = transcript || 'Aucun texte reconnu pour l’instant.';
}

function hideVoiceChatPanel() {
  const panel = document.getElementById('voiceChatPanel');
  if (panel) {
    panel.classList.add('hidden');
  }
}

function startVoiceDictation() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    updateVoicePanel('La dictée vocale n’est pas disponible sur ce navigateur.', '');
    return;
  }

  if (speechRecognizer) {
    speechRecognizer.stop();
    speechRecognizer = null;
  }

  voiceMode = 'dictation';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = getSpeechRecognitionLanguage();
  speechRecognizer.onspeechstart = () => {
    cancelAthenaSpeech();
  };
  speechRecognizer.onaudiostart = () => {
    cancelAthenaSpeech();
  };
  speechRecognizer.onsoundstart = () => {
    cancelAthenaSpeech();
  };

  voiceTranscript = '';
  voiceInterim = '';
  lastVoiceDictationRecognized = '';
  lastVoiceDictationTranslated = '';
  updateVoicePanel('Dictée en cours...', '');

  speechRecognizer.onresult = (event) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        voiceTranscript += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }
    voiceInterim = interimText;
    const currentRecognized = `${voiceTranscript}${voiceInterim}`.trim();
    lastVoiceDictationRecognized = currentRecognized;
    updateVoicePanel('Dictée en cours...', currentRecognized);
  };

  speechRecognizer.onerror = (event) => {
    updateVoicePanel(`Erreur dictée : ${event.error}`, `${voiceTranscript}${voiceInterim}`);
  };

  speechRecognizer.onend = () => {
    if (voiceMode !== 'dictation') {
      return;
    }
    if (!voiceTranscript && !voiceInterim) {
      updateVoicePanel('Dictée arrêtée. Aucune voix reconnue.', '');
    } else {
      updateVoicePanel('Dictée terminée. Valide ou annule.', `${voiceTranscript}${voiceInterim}`);
    }
  };

  try {
    speechRecognizer.start();
  } catch (error) {
    updateVoicePanel(`Erreur dictée : ${error.message}`, '');
  }
}

function cancelVoiceDictation() {
  if (speechRecognizer && voiceMode === 'dictation') {
    speechRecognizer.stop();
    speechRecognizer = null;
  }
  
  // Clear translation timer
  if (voiceTranslationTimer) {
    window.clearTimeout(voiceTranslationTimer);
    voiceTranslationTimer = null;
  }
  
  voiceMode = null;
  voiceTranscript = '';
  voiceInterim = '';
  hideVoicePanel();
}

function confirmVoiceDictation() {
  const input = document.getElementById('messageInput');
  const transcript = lastVoiceDictationTranslated || `${voiceTranscript}${voiceInterim}`.trim();
  if (input && transcript) {
    input.value = transcript;
    input.focus();
  }
  cancelVoiceDictation();
  if (transcript) {
    sendMessage();
  }
}

function startVoiceChat() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    updateVoiceChatPanel('Le mode vocal n’est pas compatible avec ce navigateur. Utilise Google Chrome ou Microsoft Edge.', '');
    return;
  }

  if (voiceChatActive) {
    return;
  }

  voiceChatActive = true;
  voiceMode = 'chat';
  voiceChatTranscript = '';
  voiceChatInterim = '';
  voiceChatShouldRestart = false;
  lastVoiceChatRecognized = '';
  lastVoiceChatTranslated = '';
  updateVoiceChatPanel('Préparation du chat vocal...', '');

  const voiceButton = document.querySelector('.composer-voice');
  if (voiceButton) {
    voiceButton.classList.add('listening');
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = getSpeechRecognitionLanguage();
  voiceRecognition.maxAlternatives = 1;
  voiceRecognition.onspeechstart = () => {
    cancelAthenaSpeech();
  };
  voiceRecognition.onaudiostart = () => {
    cancelAthenaSpeech();
  };
  voiceRecognition.onsoundstart = () => {
    cancelAthenaSpeech();
  };

  voiceRecognition.onresult = (event) => {
    if (athenaIsSpeaking) {
      return;
    }

    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) {
        voiceChatTranscript += `${transcript} `;
      } else {
        interimText += transcript;
      }
    }

    voiceChatInterim = interimText;
    const rawTranscript = `${voiceChatTranscript}${voiceChatInterim}`.trim();
    updateVoiceChatPanel('Je t’écoute... Parle librement.', rawTranscript || 'En cours de reconnaissance...');

    if (voiceChatSilenceTimer) {
      window.clearTimeout(voiceChatSilenceTimer);
    }

    voiceChatSilenceTimer = window.setTimeout(async () => {
      voiceChatSilenceTimer = null;
      stopVoiceRecognition(false);
      await processVoiceChatTranscript();
    }, 7000);
  };

  voiceRecognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      updateVoiceChatPanel('Aucune voix détectée. Réessayez ou utilisez le clavier.', '');
    } else {
      updateVoiceChatPanel(`Erreur chat vocal : ${event.error}`, '');
    }
    stopVoiceRecognition(false);
  };

  voiceRecognition.onend = () => {
    if (voiceChatActive && !athenaIsSpeaking && voiceChatShouldRestart) {
      startVoiceRecognition();
    }
  };

  const selectedLanguage = document.getElementById('language')?.value || 'Français';
  const selectedLanguageName = getSelectedLanguageName(selectedLanguage);
  const canSpeak = canSpeakSelectedResponseLanguage(selectedLanguage);

  const greeting = getTranslatedWelcomeSubtitle();
  if (canSpeak) {
    athenaIsSpeaking = true;
    speakAthenaText(greeting, () => {
      athenaIsSpeaking = false;
      if (voiceChatActive) {
        updateVoiceChatPanel('Chat vocal activé. Je t’écoute.', '');
        startVoiceRecognition();
      }
    });
  } else {
    if (['Créole haïtien', 'Arabe', 'Bengali', 'Ourdou'].includes(selectedLanguageName)) {
      updateVoiceChatPanel('La lecture vocale n’est pas encore disponible pour cette langue. Vous pouvez continuer à utiliser la dictée vocale et le chat écrit. Cette fonctionnalité sera ajoutée ultérieurement.', '');
    } else {
      updateVoiceChatPanel('Voix non disponible pour cette langue dans ce navigateur.', '');
    }
    athenaIsSpeaking = false;
    if (voiceChatActive) {
      startVoiceRecognition();
    }
  }
}


function startVoiceRecognition() {
  if (!voiceRecognition) {
    return;
  }

  cancelAthenaSpeech();
  voiceChatShouldRestart = true;
  try {
    voiceRecognition.start();
  } catch (error) {
    console.warn('Impossible de démarrer la reconnaissance vocale :', error);
  }
}

function stopVoiceRecognition(allowRestart = true) {
  voiceChatShouldRestart = allowRestart;
  if (voiceChatSilenceTimer) {
    window.clearTimeout(voiceChatSilenceTimer);
    voiceChatSilenceTimer = null;
  }
  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (error) {
      console.warn(error);
    }
  }
}

async function processVoiceChatTranscript() {
  const rawTranscript = `${voiceChatTranscript}${voiceChatInterim}`.trim();
  voiceChatTranscript = '';
  voiceChatInterim = '';

  if (!rawTranscript) {
    updateVoiceChatPanel('Aucune voix reconnue. Réessaie ou utilise le clavier.', '');
    return;
  }

  const targetLanguage = getSelectedResponseLanguageName();
  updateVoiceChatPanel('Pause détectée. Traduction en cours...', `Reconnu : "${rawTranscript}"`);

  const translatedText = await translateVoiceInputToResponseLanguage(rawTranscript);
  const translationFailed = !translatedText || !translatedText.trim();
  const userMessage = translationFailed ? rawTranscript.trim() : translatedText.trim();

  if (translationFailed) {
    showToast('Traduction automatique indisponible, le message reconnu a été envoyé directement.', 'warning');
    updateVoiceChatPanel('Envoi du texte reconnu brut.', `Reconnu : "${rawTranscript}"`);
  } else {
    updateVoiceChatPanel('Texte traduit et envoyé.', `Reconnu : "${rawTranscript}"
Envoyé : "${userMessage}"`);
  }

  await sendVoiceChatMessage(userMessage, {
    apiMessage: translationFailed ? buildVoiceChatFallbackApiMessage(rawTranscript) : userMessage
  });
}

async function sendVoiceChatMessage(message, options = {}) {
  if (!voiceChatActive) {
    return;
  }

  addUserMessage(message);
  saveHistory(message);
  updateVoiceChatPanel('Message envoyé. ATHENA réfléchit...', '');

  const apiMessage = options.apiMessage || message;
  const data = {
    message: apiMessage,
    mode: document.getElementById('mode').value,
    subject: document.getElementById('subject').value,
    level: document.getElementById('level').value,
    grade: document.getElementById('grade').value,
    language: document.getElementById('language').value,
    performance: document.getElementById('performance').value,
    fileText: importedFileText
  };

  const loading = document.createElement('div');
  loading.className = 'message assistant';
  loading.textContent = 'ATHENA réfléchit...';
  document.getElementById('chatWindow').appendChild(loading);
  scrollChat();

  try {
    if (voiceRecognition) {
      stopVoiceRecognition(false);
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Erreur de communication avec ATHENA.');
    }

    loading.textContent = result.answer;
    checkApiStatus();

    const selectedLanguage = document.getElementById('language')?.value || 'Français';
    const canSpeak = canSpeakSelectedResponseLanguage(selectedLanguage);

    if (voiceChatActive && canSpeak) {
      athenaIsSpeaking = true;
      speakAthenaText(result.answer, () => {
        athenaIsSpeaking = false;
        if (voiceChatActive) {
          updateVoiceChatPanel('Chat vocal activé. Je t’écoute.', '');
          startVoiceRecognition();
        }
      });
    } else {
      if (voiceChatActive) {
        updateVoiceChatPanel('Chat vocal activé. Je t’écoute.', '');
        startVoiceRecognition();
      }
    }

    if (currentUser) {
      if (!currentConversationId) {
        await createConversation('Nouvelle discussion');
      }
      currentConversationMessages.push({ role: 'user', content: message });
      currentConversationMessages.push({ role: 'assistant', content: result.answer });
      await persistConversationMessage(currentConversationId, 'user', message);
      await persistConversationMessage(currentConversationId, 'assistant', result.answer);
      await loadConversations();
      renderSidebar();
    }
  } catch (error) {
    loading.textContent = 'Erreur : ' + error.message + '\n\nVérifie que le serveur est lancé avec npm start et que la clé API est correcte dans le fichier .env.';
    if (voiceChatActive) {
      setTimeout(() => {
        if (!athenaIsSpeaking) {
          startVoiceRecognition();
        }
      }, 800);
    }
  }
}

function stopVoiceChat() {
  voiceChatActive = false;
  voiceChatShouldRestart = false;
  stopVoiceRecognition(false);
  cancelAthenaSpeech();

  const voiceButton = document.querySelector('.composer-voice');
  if (voiceButton) {
    voiceButton.classList.remove('listening');
  }

  voiceMode = null;
  voiceChatTranscript = '';
  voiceChatInterim = '';
  hideVoiceChatPanel();
}

document.addEventListener("DOMContentLoaded", async () => {
  restoreTheme();
  restoreDefaultResponseLanguage();
  bindDefaultResponseLanguagePersistence();
  initHeroCarousel();
  checkApiStatus();
  loadAthenaVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadAthenaVoices;
  }
  await loadSession();
  syncModePickerState();
  syncSubjectPickerState();

  if (currentUser) {
    enterApp();
  }
});

document.addEventListener("click", (event) => {
  const menu = event.target.closest(".conversation-menu");
  const trigger = event.target.closest(".conversation-menu-trigger");

  const composerMenu = document.getElementById('composerMenu');
  const composerTrigger = event.target.closest('.composer-plus');
  const composerMenuClicked = event.target.closest('#composerMenu');
  const modeDropdown = event.target.closest('.mode-dropdown');
  const subjectDropdown = event.target.closest('.subject-dropdown');

  if (!menu && !trigger) {
    activeConversationMenuId = null;
    renderSidebar();
  }

  if (!composerMenuClicked && !composerTrigger && composerMenu) {
    composerMenu.classList.add('hidden');
  }

  if (!modeDropdown) {
    hideModeMenu();
  }

  if (!subjectDropdown) {
    hideSubjectMenu();
  }

  const modeTrigger = event.target.closest('#modeTrigger');
  if (modeTrigger) {
    event.preventDefault();
    toggleModeMenu();
    return;
  }

  const modeOption = event.target.closest('.mode-dropdown-option');
  if (modeOption) {
    event.preventDefault();
    setMode(modeOption.dataset.mode);
    return;
  }

  const subjectTrigger = event.target.closest('#subjectTrigger');
  if (subjectTrigger) {
    event.preventDefault();
    toggleSubjectMenu();
    return;
  }

  const subjectCategory = event.target.closest('.subject-category-button');
  if (subjectCategory) {
    event.preventDefault();
    const submenu = document.querySelector(`.subject-submenu[data-category="${subjectCategory.dataset.category}"]`);
    if (submenu) {
      document.querySelectorAll('.subject-submenu').forEach((section) => {
        if (section !== submenu) {
          section.classList.add('hidden');
          const relatedButton = document.querySelector(`.subject-category-button[data-category="${section.dataset.category}"]`);
          if (relatedButton) {
            relatedButton.setAttribute('aria-expanded', 'false');
          }
        }
      });

      submenu.classList.toggle('hidden');
      subjectCategory.setAttribute('aria-expanded', String(!submenu.classList.contains('hidden')));
    }
    return;
  }

  const subjectOption = event.target.closest('.subject-option');
  if (subjectOption) {
    event.preventDefault();
    setSubject(subjectOption.dataset.subject);
  }
});

function showPublicPage(id) {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function enterApp() {
  if (!currentUser) {
    openModal("loginModal");
    return;
  }

  const publicSite = document.getElementById("publicSite");
  const appShell = document.getElementById("appShell");
  const topbar = document.querySelector(".topbar");

  if (!publicSite || !appShell || !topbar) {
    return;
  }

  publicSite.classList.add("hidden");
  topbar.classList.add("hidden");
  appShell.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function exitApp() {
  if (voiceChatActive) {
    stopVoiceChat();
  } else {
    cancelAthenaSpeech();
  }

  const publicSite = document.getElementById("publicSite");
  const appShell = document.getElementById("appShell");
  const topbar = document.querySelector(".topbar");

  if (!publicSite || !appShell || !topbar) {
    return;
  }

  appShell.classList.add("hidden");
  publicSite.classList.remove("hidden");
  topbar.classList.remove("hidden");
  window.scrollTo(0, 0);
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('sidebar-open');
  if (isOpen) {
    sidebar.classList.remove('sidebar-open');
    overlay && overlay.classList.add('hidden');
  } else {
    sidebar.classList.add('sidebar-open');
    overlay && overlay.classList.remove('hidden');
  }
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar && sidebar.classList.remove('sidebar-open');
  overlay && overlay.classList.add('hidden');
}

function returnToPublicPage(sectionId = "home") {
  exitApp();
  requestAnimationFrame(() => {
    showPublicPage(sectionId);
  });
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("athena_theme", isDark ? "dark" : "light");
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = isDark ? "Mode clair" : "Mode sombre";
}

function restoreTheme() {
  const saved = localStorage.getItem("athena_theme");
  const isDark = saved === "dark" || (!saved);
  if (isDark) document.body.classList.add("dark");
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = isDark ? "Mode clair" : "Mode sombre";
}

function initHeroCarousel() {
  const heroVisual = document.querySelector(".hero-visual");
  if (!heroVisual) {
    return;
  }

  const slides = Array.from(heroVisual.querySelectorAll(".hero-slide"));
  const leftArrow = heroVisual.querySelector(".carousel-arrow.left");
  const rightArrow = heroVisual.querySelector(".carousel-arrow.right");
  const dots = Array.from(heroVisual.querySelectorAll(".dots span"));
  if (!slides.length) {
    return;
  }

  let activeIndex = 0;

  const showSlide = (index) => {
    activeIndex = index;
    slides.forEach((slide, idx) => slide.classList.toggle("active", idx === index));
    dots.forEach((dot, idx) => dot.classList.toggle("active", idx === index));
  };

  const nextSlide = () => showSlide((activeIndex + 1) % slides.length);
  const prevSlide = () => showSlide((activeIndex - 1 + slides.length) % slides.length);
  const resetTimer = () => {
    if (heroCarouselTimer) {
      clearInterval(heroCarouselTimer);
    }
    heroCarouselTimer = setInterval(nextSlide, 6000);
  };

  if (leftArrow) {
    leftArrow.addEventListener("click", () => {
      prevSlide();
      resetTimer();
    });
  }

  if (rightArrow) {
    rightArrow.addEventListener("click", () => {
      nextSlide();
      resetTimer();
    });
  }

  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => {
      showSlide(idx);
      resetTimer();
    });
  });

  showSlide(0);
  resetTimer();
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function switchModal(from, to) {
  closeModal(from);
  openModal(to);
}

function updateAuthUI() {
  const authButton = document.getElementById("authButton");
  const logoutButton = document.getElementById("logoutBtn");
  const welcomeTitle = document.querySelector(".welcome h1");

  if (authButton) {
    authButton.textContent = currentUser ? "Déconnexion" : "Connexion";
    authButton.onclick = currentUser ? logout : () => openModal("loginModal");
  }

  if (logoutButton) {
    logoutButton.classList.toggle("hidden", !currentUser);
  }

  if (welcomeTitle) {
    welcomeTitle.textContent = currentUser
      ? `Bonjour ${currentUser.firstName || "ATHENA"}, je suis ATHENA`
      : "Bonjour, je suis ATHENA";
  }

  if (currentUser) {
    setWelcomeSubtitle();
  }

  renderSidebar();
}

function resetImportedFileState() {
  importedFileText = "";
  document.getElementById("fileStatus").textContent = "Aucun fichier importé.";
}

function clearChat() {
  document.getElementById("chatWindow").innerHTML = "";
}

function renderMessages(messages) {
  clearChat();
  currentConversationMessages = messages || [];

  messages.forEach((message) => {
    if (message.role === "user") {
      addUserMessage(message.content);
    } else {
      addAssistantMessage(message.content);
    }
  });
}

function renderSidebar() {
  const box = document.getElementById("historyList");

  if (!box) {
    return;
  }

  const sidebarConversations = [...conversations].sort((left, right) => {
    const pinnedDiff = Number(Boolean(right.pinned)) - Number(Boolean(left.pinned));

    if (pinnedDiff !== 0) {
      return pinnedDiff;
    }

    return new Date(right.updatedAt) - new Date(left.updatedAt);
  });

  box.innerHTML = "";

  const renderHistoryItem = (title, onOpen, isActive = false, pinned = false, menuId = null) => {
    const row = document.createElement("div");
    row.className = "history-row";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.textContent = `${pinned ? "📌 " : ""}${title.length > 40 ? `${title.slice(0, 40)}...` : title}`;
    button.onclick = onOpen;

    if (isActive) {
      button.style.fontWeight = "800";
    }

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "conversation-menu-trigger";
    menuButton.textContent = "…";
    menuButton.onclick = (event) => {
      event.stopPropagation();
      if (activeConversationMenuId === menuId) {
        activeConversationMenuId = null;
      } else {
        activeConversationMenuId = menuId;
      }
      renderSidebar();
    };

    const menu = document.createElement("div");
    menu.className = `conversation-menu ${activeConversationMenuId === menuId ? "visible" : "hidden"}`;
    menu.innerHTML = `
      <button type="button" class="conversation-menu-item" data-action="rename" data-id="${menuId}">Renommer</button>
      <button type="button" class="conversation-menu-item" data-action="pin" data-id="${menuId}">${pinned ? "Désépingler" : "Épingler"}</button>
      <button type="button" class="conversation-menu-item" data-action="share" data-id="${menuId}">Partager</button>
      <button type="button" class="conversation-menu-item" data-action="delete" data-id="${menuId}">Supprimer</button>
    `;

    menu.querySelectorAll("button[data-action]").forEach((item) => {
      item.onclick = async (event) => {
        event.stopPropagation();
        const action = item.dataset.action;
        const id = item.dataset.id;
        activeConversationMenuId = null;
        renderSidebar();

        if (action === "rename") {
          await renameConversation(id);
          return;
        }

        if (action === "pin") {
          await togglePinConversation(id);
          return;
        }

        if (action === "share") {
          await shareConversation(id);
          return;
        }

        if (action === "delete") {
          await deleteConversation(id);
        }
      };
    });

    row.appendChild(button);
    row.appendChild(menuButton);
    row.appendChild(menu);
    box.appendChild(row);
  };

  if (currentUser) {
    if (!conversations.length) {
      const empty = document.createElement("div");
      empty.className = "history-item";
      empty.textContent = "Aucune discussion enregistrée.";
      box.appendChild(empty);
      return;
    }

    sidebarConversations.forEach((conversation) => {
      renderHistoryItem(
        conversation.title || "Nouvelle discussion",
        () => openConversation(conversation.id),
        currentConversationId === conversation.id,
        Boolean(conversation.pinned),
        conversation.id
      );
    });

    return;
  }

  history.slice(0, 5).forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.textContent = item.length > 40 ? `${item.slice(0, 40)}...` : item;
    box.appendChild(div);
  });
}

async function loadSession() {
  try {
    const { response, data } = await safeJsonFetch("/api/me", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("No session");
    }

    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }

  if (currentUser) {
    await loadConversations();
  } else {
    conversations = [];
    currentConversationId = null;
    currentConversation = null;
    currentConversationMessages = [];
    renderSidebar();
  }

  updateAuthUI();
}

async function loadConversations() {
  if (!currentUser) {
    conversations = [];
    currentConversationId = null;
    renderSidebar();
    return;
  }

  try {
    const { response, data } = await safeJsonFetch("/api/conversations", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Impossible de charger les conversations.");
    }

    conversations = (data.conversations || []).map((conversation) => ({
      ...conversation,
      pinned: Boolean(conversation.pinned)
    }));
  } catch (error) {
    conversations = [];
    showToast(error.message, "error");
  }

  renderSidebar();
}

async function createConversation(title = "Nouvelle discussion") {
  const { response, data } = await safeJsonFetch("/api/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify({ title })
  });

  if (!response.ok) {
    throw new Error(data.error || "Impossible de créer la conversation.");
  }

  currentConversationId = data.conversation.id;
  currentConversation = data.conversation;
  currentConversationMessages = [];
  clearChat();
  resetImportedFileState();
  await loadConversations();
  return data.conversation;
}

async function openConversation(id) {
  if (!currentUser) {
    return;
  }

  try {
    const { response, data } = await safeJsonFetch(`/api/conversations/${id}`, {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(data.error || "Impossible d’ouvrir la conversation.");
    }

    currentConversationId = id;
    currentConversation = data.conversation;
    currentConversationMessages = data.messages || [];
    renderMessages(currentConversationMessages);
    resetImportedFileState();
    renderSidebar();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function persistConversationMessage(conversationId, role, content) {
  const { response, data } = await safeJsonFetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify({ role, content })
  });

  if (!response.ok) {
    throw new Error(data.error || "Impossible d’enregistrer le message.");
  }

  await loadConversations();
  return data.message;
}

async function fakeLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Email et mot de passe requis.");
    return;
  }

  try {
    const { response, data } = await safeJsonFetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(data.error || "Connexion impossible.");
    }

    currentUser = data.user;
    await loadConversations();
    updateAuthUI();
    closeModal("loginModal");
    enterApp();
  } catch (error) {
    alert(error.message);
  }
}

async function fakeRegister() {
  const firstName = document.getElementById("regFirstName").value.trim();
  const lastName = document.getElementById("regLastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const gradeLevel = document.getElementById("regGradeLevel").value.trim();

  if (!firstName || !lastName || !email || !password || !gradeLevel) {
    alert("Tous les champs sont requis.");
    return;
  }

  try {
    const { response, data } = await safeJsonFetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        gradeLevel
      })
    });

    if (!response.ok) {
      throw new Error(data.error || "Création du compte impossible.");
    }

    currentUser = data.user;
    await loadConversations();
    updateAuthUI();
    closeModal("registerModal");
    enterApp();
  } catch (error) {
    alert(error.message);
  }
}

async function logout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } catch {
    // On ignore l’échec de la requête et on nettoie l’UI localement.
  }

  currentUser = null;
  currentConversationId = null;
  currentConversation = null;
  currentConversationMessages = [];
  conversations = [];
  renderSidebar();
  updateAuthUI();
  exitApp();
}

function syncSubjectPickerState() {
  const hiddenInput = document.getElementById("subject");
  const triggerText = document.getElementById("subjectTriggerText");
  const menu = document.getElementById("subjectMenu");
  const trigger = document.getElementById("subjectTrigger");

  if (!hiddenInput || !triggerText || !menu || !trigger) {
    return;
  }

  const subject = hiddenInput.value || "Mathématiques";
  triggerText.textContent = subject;
  trigger.setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));

  menu.querySelectorAll(".subject-option").forEach((option) => {
    const selected = option.dataset.subject === subject;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-selected", String(selected));
  });

  menu.querySelectorAll(".subject-category-button").forEach((button) => {
    const submenu = menu.querySelector(`.subject-submenu[data-category="${button.dataset.category}"]`);
    if (submenu) {
      button.setAttribute("aria-expanded", String(submenu.classList.contains("hidden") ? "false" : "true"));
      const chevron = button.querySelector(".subject-chevron");
      if (chevron) {
        chevron.textContent = '›';
      }
    }
  });
}

function closeAllSubjectSubmenus() {
  const menu = document.getElementById("subjectMenu");
  if (!menu) return;

  menu.querySelectorAll(".subject-submenu").forEach((submenu) => submenu.classList.add("hidden"));
  menu.querySelectorAll(".subject-category-button").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function hideSubjectMenu() {
  const menu = document.getElementById("subjectMenu");
  const trigger = document.getElementById("subjectTrigger");
  if (menu) {
    menu.classList.add("hidden");
  }
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
  closeAllSubjectSubmenus();
}

function toggleSubjectMenu() {
  const menu = document.getElementById("subjectMenu");
  if (!menu) return;

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
  } else {
    menu.classList.add("hidden");
    closeAllSubjectSubmenus();
  }

  const trigger = document.getElementById("subjectTrigger");
  if (trigger) {
    trigger.setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));
  }
}

function setSubject(subject) {
  const hiddenInput = document.getElementById("subject");
  if (hiddenInput) {
    hiddenInput.value = subject;
  }

  syncSubjectPickerState();
  hideSubjectMenu();
}

function quickSubject(subject) {
  setSubject(subject);
  document.getElementById("messageInput").focus();
}

function syncModePickerState() {
  const hiddenInput = document.getElementById("mode");
  const triggerText = document.getElementById("modeTriggerText");
  const menu = document.getElementById("modeMenu");
  const trigger = document.getElementById("modeTrigger");

  if (!hiddenInput || !triggerText || !menu || !trigger) {
    return;
  }

  const labels = {
    expliquer: "Expliquer",
    simplifier: "Simplifier",
    corriger: "Corriger",
    quiz: "Exercices",
    examen: "Évaluation",
    professeur: "Professeur particulier"
  };

  const mode = hiddenInput.value || "expliquer";
  triggerText.textContent = labels[mode] || mode;
  trigger.setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));

  menu.querySelectorAll(".mode-dropdown-option").forEach((option) => {
    const selected = option.dataset.mode === mode;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-selected", String(selected));
  });
}

function hideModeMenu() {
  const menu = document.getElementById("modeMenu");
  const trigger = document.getElementById("modeTrigger");
  if (menu) {
    menu.classList.add("hidden");
  }
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
}

function toggleModeMenu() {
  const menu = document.getElementById("modeMenu");
  if (!menu) return;

  const isHidden = menu.classList.contains("hidden");
  if (isHidden) {
    menu.classList.remove("hidden");
  } else {
    menu.classList.add("hidden");
  }

  const trigger = document.getElementById("modeTrigger");
  if (trigger) {
    trigger.setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));
  }
}

function setMode(mode) {
  const hiddenInput = document.getElementById("mode");
  if (hiddenInput) {
    hiddenInput.value = mode;
  }

  const suggestions = {
    expliquer: "Explique-moi cette notion avec une définition, un exemple et un exercice.",
    simplifier: "Simplifie cette leçon pour un élève qui a des difficultés.",
    corriger: "Corrige ma réponse et explique mes erreurs.",
    quiz: "Crée des exercices avec réponses et corrections.",
    examen: "Crée un examen sur 100 points avec barème et corrigé.",
    professeur: "Aide-moi comme un professeur particulier, pas à pas, avec une vérification finale."
  };

  syncModePickerState();
  document.getElementById("messageInput").value = suggestions[mode] || "";
  hideModeMenu();
}

async function newDiscussion() {
  if (currentUser) {
    await createConversation("Nouvelle discussion");
    clearChat();
    resetImportedFileState();
    setWelcomeSubtitle();
    return;
  }

  currentConversationId = null;
  currentConversation = null;
  clearChat();
  resetImportedFileState();
  setWelcomeSubtitle();
}

function showResources() {
  addAssistantMessage(`Ressources ATHENA disponibles :
- Mode Explication : comprendre une leçon
- Mode Simplification : reformuler avec des mots faciles
- Mode Correction : analyser une réponse
- Mode Exercices : s'entraîner rapidement
- Mode Examen : préparer une évaluation complète
- Mode Professeur particulier : accompagner et guider pas à pas`);
}

function addUserMessage(text) {
  const div = document.createElement("div");
  div.className = "message user user-message";
  div.textContent = text;
  document.getElementById("chatWindow").appendChild(div);
  scrollChat();
}

function addAssistantMessage(text) {
  const div = document.createElement("div");
  div.className = "message assistant assistant-message";
  div.textContent = text;
  document.getElementById("chatWindow").appendChild(div);
  scrollChat();

  if (nextAssistantSpeech) {
    nextAssistantSpeech = false;
    speakAthenaText(text);
  }
}

function scrollChat() {
  const workspace = document.querySelector(".workspace");
  if (workspace) {
    workspace.scrollTop = workspace.scrollHeight;
    return;
  }

  const chat = document.getElementById("chatWindow");
  chat.scrollTop = chat.scrollHeight;
}

function updateHistory() {
  const box = document.getElementById("historyList");
  if (!box) return;
  box.innerHTML = "";
  history.slice(0, 5).forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.textContent = item.length > 40 ? `${item.slice(0, 40)}...` : item;
    box.appendChild(div);
  });
}

function saveHistory(text) {
  history.unshift(text);
  history = history.slice(0, 8);
  localStorage.setItem("athena_history", JSON.stringify(history));
  updateHistory();
}

async function checkApiStatus() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    const status = document.getElementById("apiStatus");
    status.textContent = data.apiConnected
      ? `✓ ${data.message} — ${data.model}`
      : `⚠ ${data.message}`;
    status.style.color = data.apiConnected ? "#55e69d" : "#ffd166";
  } catch {
    document.getElementById("apiStatus").textContent = "⚠ Serveur non détecté. Lance npm start.";
    document.getElementById("apiStatus").style.color = "#ffd166";
  }
}

async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Choisis d'abord un fichier.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  document.getElementById("fileStatus").textContent = "Importation du fichier...";

  try {
    const response = await fetch("/api/file", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de l'importation.");
    }

    importedFileText = data.text;
    document.getElementById("fileStatus").textContent = `Fichier importé : ${data.fileName}`;
    setMode("professeur");
    addAssistantMessage(`J'ai reçu le fichier "${data.fileName}". Tu peux maintenant me demander de le résumer, de l'expliquer ou de créer des exercices à partir de son contenu.`);
  } catch (error) {
    document.getElementById("fileStatus").textContent = error.message;
  }
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const message = input.value.trim();

  if (!message) {
    alert("Écris une question avant d’envoyer.");
    return;
  }

  const data = {
    message,
    mode: document.getElementById("mode").value,
    subject: document.getElementById("subject").value,
    level: document.getElementById("level").value,
    grade: document.getElementById("grade").value,
    language: document.getElementById("language").value,
    performance: document.getElementById("performance").value,
    fileText: importedFileText
  };

  if (!currentUser) {
    addUserMessage(message);
    saveHistory(message);
    input.value = "";

    const loading = document.createElement("div");
    loading.className = "message assistant";
    loading.textContent = "ATHENA réfléchit...";
    document.getElementById("chatWindow").appendChild(loading);
    scrollChat();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur de communication avec ATHENA.");
      }

      loading.textContent = result.answer;
      checkApiStatus();
      return;
    } catch (error) {
      loading.textContent = "Erreur : " + error.message + "\n\nVérifie que le serveur est lancé avec npm start et que la clé API est correcte dans le fichier .env.";
    }

    return;
  }

  if (!currentConversationId) {
    await createConversation("Nouvelle discussion");
  }

  addUserMessage(message);
  currentConversationMessages.push({ role: "user", content: message });
  input.value = "";

  const loading = document.createElement("div");
  loading.className = "message assistant";
  loading.textContent = "ATHENA réfléchit...";
  document.getElementById("chatWindow").appendChild(loading);
  scrollChat();

  try {
    await persistConversationMessage(currentConversationId, "user", message);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Erreur de communication avec ATHENA.");
    }

    loading.textContent = result.answer;
    currentConversationMessages.push({ role: "assistant", content: result.answer });
    await persistConversationMessage(currentConversationId, "assistant", result.answer);
    await loadConversations();
    renderSidebar();
    checkApiStatus();
  } catch (error) {
    loading.textContent = "Erreur : " + error.message + "\n\nVérifie que le serveur est lancé avec npm start et que la clé API est correcte dans le fichier .env.";
  }
}

async function renameConversation(conversationId = currentConversationId) {
  if (!currentUser || !conversationId) {
    showToast("Ouvre d’abord une discussion à renommer.", "error");
    return;
  }

  const current = conversations.find((item) => item.id === conversationId);
  if (!current) {
    showToast("Discussion introuvable.", "error");
    return;
  }

  currentConversationId = conversationId;
  currentConversation = current;

  const nextTitle = window.prompt("Nouveau titre de la discussion", current.title || "");

  if (nextTitle === null) {
    return;
  }

  const trimmedTitle = nextTitle.trim();

  if (!trimmedTitle) {
    showToast("Le titre ne peut pas être vide.", "error");
    return;
  }

  try {
    const { response, data } = await safeJsonFetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ title: trimmedTitle })
    });

    if (!response.ok) {
      throw new Error(data.error || "Impossible de renommer la discussion.");
    }

    currentConversation = data.conversation;
    await loadConversations();
    renderSidebar();
    showToast("Titre mis à jour.", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function togglePinConversation(conversationId = currentConversationId) {
  if (!currentUser || !conversationId) {
    showToast("Ouvre d’abord une discussion à épingler.", "error");
    return;
  }

  const current = conversations.find((item) => item.id === conversationId);
  if (!current) {
    showToast("Discussion introuvable.", "error");
    return;
  }

  currentConversationId = conversationId;
  currentConversation = current;
  const nextPinned = !current.pinned;

  try {
    const { response, data } = await safeJsonFetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ pinned: nextPinned })
    });

    if (!response.ok) {
      throw new Error(data.error || "Impossible de mettre à jour l’épinglage.");
    }

    currentConversation = data.conversation;
    await loadConversations();
    renderSidebar();
    showToast(nextPinned ? "Discussion épinglée en haut de la liste." : "Discussion désépinglée.", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function deleteConversation(conversationId = currentConversationId) {
  if (!currentUser || !conversationId) {
    showToast("Ouvre d’abord une discussion à supprimer.", "error");
    return;
  }

  const current = conversations.find((item) => item.id === conversationId);
  if (!current) {
    showToast("Discussion introuvable.", "error");
    return;
  }

  if (!confirm(`Supprimer la discussion « ${current.title} » ?`)) {
    return;
  }

  try {
    const { response, data } = await safeJsonFetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(data.error || "Impossible de supprimer la discussion.");
    }

    if (currentConversationId === conversationId) {
      currentConversationId = null;
      currentConversation = null;
      currentConversationMessages = [];
      clearChat();
      resetImportedFileState();
      addAssistantMessage("Discussion supprimée. Je suis prête pour une nouvelle conversation.");
    }

    await loadConversations();
    renderSidebar();
    showToast("Discussion supprimée.", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function shareConversation(conversationId = currentConversationId) {
  if (!currentUser || !conversationId) {
    showToast("Ouvre d’abord une discussion à partager.", "error");
    return;
  }

  const current = conversations.find((item) => item.id === conversationId);
  if (!current) {
    showToast("Discussion introuvable.", "error");
    return;
  }

  currentConversationId = conversationId;
  currentConversation = current;

  try {
    const { response, data } = await safeJsonFetch(`/api/conversations/${conversationId}/share`, {
      method: "POST",
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error(data.error || "Impossible de créer le lien de partage.");
    }

    const shareUrl = data.shareUrl;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Lien de partage copié.", "success");
      return;
    }

    window.prompt("Copie ce lien de partage", shareUrl);
    showToast("Lien de partage prêt à être copié.", "info");
  } catch (error) {
    showToast(error.message, "error");
  }
}
