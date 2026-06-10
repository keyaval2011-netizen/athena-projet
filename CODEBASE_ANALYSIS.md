# ATHENA Codebase Analysis - Comprehensive Report

## 1. THREE DOTS MENU (Conversation Actions)

### Frontend Functions (public/app.js)

#### Menu Rendering & Triggering
- **`renderSidebar()`** [Line 1262]
  - Creates conversation list UI with three-dot menu
  - Manages `activeConversationMenuId` state
  - Builds HTML with action buttons: Rename, Pin, Share, Delete
  - Event handler: `item.onclick = async (event)` on each menu item

#### Menu Click Detection
- **Global event listener** [Line 1050]
  ```javascript
  document.addEventListener("click", (event) => {
    const menu = event.target.closest(".conversation-menu");
    const trigger = event.target.closest(".conversation-menu-trigger");
    
    if (!menu && !trigger) {
      activeConversationMenuId = null;
      renderSidebar();
    }
  });
  ```
  - Detects clicks on `.conversation-menu` and `.conversation-menu-trigger`
  - Closes menu if clicked outside

#### Menu Action Functions

**1. Rename Conversation**
```
Function: renameConversation(conversationId)
Endpoint: PATCH /api/conversations/:id
Body: { title: trimmedTitle }
Error Handling: safeJsonFetch with try-catch
Toast feedback: "Titre mis à jour." or error message
Location: app.js Line 2214
```

**2. Pin/Unpin Conversation**
```
Function: togglePinConversation(conversationId)
Endpoint: PATCH /api/conversations/:id
Body: { pinned: nextPinned } (boolean toggle)
Error Handling: safeJsonFetch with try-catch
Toast feedback: Pin or unpin message
Location: app.js Line 2253
```

**3. Delete Conversation**
```
Function: deleteConversation(conversationId)
Endpoint: DELETE /api/conversations/:id
Method: DELETE (no body)
Requires: window.confirm() confirmation dialog
Clears state if current conversation deleted
Toast feedback: "Discussion supprimée." or error
Location: app.js Line 2286
```

**4. Share Conversation**
```
Function: shareConversation(conversationId)
Endpoint: POST /api/conversations/:id/share
Method: POST (no body)
Returns: data.shareUrl
Copies to clipboard via navigator.clipboard.writeText()
Fallback: window.prompt() if clipboard API unavailable
Toast feedback: "Lien de partage copié." or "Lien de partage prêt à être copié."
Location: app.js Line 2319
```

### Backend API Endpoints (server.js)

#### Implemented Endpoints
- ✅ `GET /api/conversations` [Line 518] - list conversations
- ✅ `POST /api/conversations` [Line 531] - create conversation
- ✅ `GET /api/conversations/:id` [Line 553] - get conversation with messages
- ✅ `POST /api/conversations/:id/messages` [Line 569] - add message to conversation

#### **MISSING Endpoints** ⚠️
- ❌ `PATCH /api/conversations/:id` - rename & pin (frontend expects this)
- ❌ `DELETE /api/conversations/:id` - delete conversation (frontend expects this)
- ❌ `POST /api/conversations/:id/share` - share link generation (frontend expects this)

### Current Error Handling
- Frontend uses `safeJsonFetch()` which checks for non-JSON responses
- Throws error if response is HTML instead of JSON
- All menu actions show toast notifications (success/error)

---

## 2. VOICE RECOGNITION & TRANSLATION

### Global Voice Variables (app.js Lines 1-30)
```javascript
let speechRecognizer = null;           // SpeechRecognition instance for dictation
let voiceRecognition = null;            // SpeechRecognition instance for chat
let voiceMode = null;                   // 'dictation' or 'chat'
let voiceTranscript = "";               // Final recognized text in dictation mode
let voiceInterim = "";                  // Interim results in dictation mode
let voiceChatTranscript = "";           // Final recognized text in chat mode
let voiceChatInterim = "";              // Interim results in chat mode
let voiceChatActive = false;            // Chat is currently active
let voiceChatShouldRestart = false;     // Flag to restart recognition
let voiceChatSilenceTimer = null;       // Timeout for silence detection
let athenaIsSpeaking = false;           // Flag for when ATHENA is speaking
```

### Dictation Mode Functions

#### `startVoiceDictation()` [Line 551]
- Initializes SpeechRecognition with:
  - `continuous: true` - keeps listening
  - `interimResults: true` - shows interim text
  - `lang: getSpeechRecognitionLanguage()` - browser default language
- **Event handlers**:
  - `onspeechstart`, `onaudiostart`, `onsoundstart` → call `cancelAthenaSpeech()`
  - `onresult` → accumulate voiceTranscript (final), voiceInterim (interim)
  - `onerror` → show error toast
  - `onend` → show final transcript and "Valide ou annule." message

#### `confirmVoiceDictation()` [Line 618]
- Transfers transcript to `#messageInput` textarea
- Calls `cancelVoiceDictation()`

#### `cancelVoiceDictation()` [Line 609]
- Stops speech recognition
- Resets: `voiceMode`, `voiceTranscript`, `voiceInterim`
- Hides voice panel

### Voice Chat Mode Functions

#### `startVoiceChat()` [Line 641]
- **Initial setup**:
  - Sets `voiceChatActive = true`, `voiceMode = 'chat'`
  - Initializes SpeechRecognition
  - Adds `.listening` class to voice button
  
- **Text-to-Speech greeting** [Line 706-723]:
  - Gets translated welcome subtitle
  - Calls `speakAthenaText(greeting, callback)`
  - Sets `athenaIsSpeaking = true` during speech
  - Callback starts voice recognition after greeting

- **Speech recognition setup**:
  - `continuous: true`, `interimResults: true`
  - `lang: getSpeechRecognitionLanguage()` (browser default)
  - `maxAlternatives: 1`

#### `startVoiceRecognition()` [Line 748]
- Starts or restarts the SpeechRecognition
- Called by voiceRecognition.onend if `voiceChatShouldRestart == true`

#### Speech Recognition Event Handlers [Line 684-724]
```javascript
voiceRecognition.onresult = (event) => {
  // Skip if ATHENA is speaking
  if (athenaIsSpeaking) return;
  
  // Accumulate final results
  voiceChatTranscript += final_text;
  voiceChatInterim = interim_text;
  
  // Clear and restart SILENCE TIMER
  window.clearTimeout(voiceChatSilenceTimer);
  voiceChatSilenceTimer = window.setTimeout(async () => {
    stopVoiceRecognition(false);
    await processVoiceChatTranscript();
  }, 7000);  // 7-SECOND SILENCE TIMEOUT
};
```

**Key Silence Detection Logic**:
- Timer resets on every new speech result
- After 7 seconds of silence → `processVoiceChatTranscript()`
- Automatically sends transcript when user stops speaking

### Translation Pipeline

#### `translateVoiceInputToResponseLanguage(recognizedText)` [Line 219]
```javascript
// Calls /api/chat with translation-only prompt
POST /api/chat {
  message: buildVoiceTranslationPrompt(recognizedText, targetLanguage),
  mode: 'professeur',
  subject, level, grade, language, performance, fileText
}
```

**Translation Prompt** [Line 214]:
```
Traduis uniquement le message suivant en [targetLanguage].
Ne réponds pas à la question.
Ne donne aucune explication.
Ne rajoute rien.
Retourne seulement la traduction naturelle et correcte.

Message: "[recognizedText]"
```

**Error Handling**:
- Try-catch wraps the fetch
- Falls back to raw recognized text if translation fails
- Shows toast: "Traduction automatique indisponible, le message reconnu a été envoyé directement."

#### `processVoiceChatTranscript()` [Line 768]
1. Combines `voiceChatTranscript` + `voiceChatInterim`
2. Calls `translateVoiceInputToResponseLanguage(rawTranscript)`
3. If translation succeeds → sends translated message
4. If translation fails → shows warning toast, sends raw text with fallback prompt
5. Calls `sendVoiceChatMessage(userMessage, options)`

#### `sendVoiceChatMessage(message, options)` [Line 800]
- Uses `apiMessage` from options (translated text or fallback)
- Sends to `/api/chat` endpoint
- If response OK:
  - Displays assistant message
  - **If voice chat active**: speaks response via `speakAthenaText(result.answer, callback)`
  - Restarts voice recognition in callback
- If error: restarts voice recognition after 800ms delay

#### `stopVoiceChat()` [Line 924]
- Sets `voiceChatActive = false`, `voiceChatShouldRestart = false`
- Calls `stopVoiceRecognition(false)`
- Removes `.listening` class from voice button
- Hides voice chat panel

---

## 3. EVENT LISTENER ANALYSIS - Menu Button Propagation Issue

### Current Implementation (app.js Line 1318-1328)

```javascript
const renderHistoryItem = (title, onOpen, isActive, pinned, menuId) => {
  const row = document.createElement("div");
  
  const button = document.createElement("button");
  button.onclick = onOpen;  // Opens conversation
  
  const menuButton = document.createElement("button");
  menuButton.onclick = (event) => {
    event.stopPropagation();  // Prevents parent click
    if (activeConversationMenuId === menuId) {
      activeConversationMenuId = null;
    } else {
      activeConversationMenuId = menuId;
    }
    renderSidebar();  // Re-renders with menu visible
  };
  
  const menu = document.createElement("div");
  menu.querySelectorAll("button[data-action]").forEach((item) => {
    item.onclick = async (event) => {
      event.stopPropagation();  // Prevents parent click
      // ... handles rename, pin, share, delete
    };
  });
};
```

### Event Flow Analysis

✅ **Correct**: 
- Main button click → opens conversation
- Three-dot button click → `event.stopPropagation()` prevents main button trigger
- Menu item clicks → `event.stopPropagation()` prevents main button trigger

⚠️ **Potential Issue**:
- If menu item is clicked, `renderSidebar()` is called which may re-render and lose focus
- After menu action completes, sidebar re-renders which calls `renderSidebar()` again
- No active conversation highlighting updated until after API response

---

## 4. FETCH ENDPOINTS & API CALLS

### Conversation Action Endpoints

| Action | Endpoint | Method | Status |
|--------|----------|--------|--------|
| Rename | `PATCH /api/conversations/:id` | PATCH | ❌ NOT IMPLEMENTED |
| Pin | `PATCH /api/conversations/:id` | PATCH | ❌ NOT IMPLEMENTED |
| Delete | `DELETE /api/conversations/:id` | DELETE | ❌ NOT IMPLEMENTED |
| Share | `POST /api/conversations/:id/share` | POST | ❌ NOT IMPLEMENTED |

### Voice Chat Fetch Calls

1. **Get Translation** (Line 265)
   ```javascript
   POST /api/chat {
     message: buildVoiceTranslationPrompt(recognizedText, targetLanguage),
     // ... other fields
   }
   ```

2. **Send Message** (Line 838)
   ```javascript
   POST /api/chat {
     message: userMessage or apiMessage,
     mode, subject, level, grade, language, performance, fileText
   }
   ```

3. **Load Conversations** (Line 1168)
   ```javascript
   GET /api/conversations
   ```

### Error Handling - Non-JSON Response Detection

#### `safeJsonFetch(url, options)` Function [Line 418]
```javascript
async function safeJsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";

  // CHECK: Is response actually JSON?
  if (!contentType.includes("application/json")) {
    const raw = await response.text();
    const message = raw && raw.includes("<!DOCTYPE html>")
      ? "Le serveur a renvoyé une page HTML au lieu d'un JSON API. Vérifie la route et l'URL."
      : `La réponse du serveur n'est pas au format JSON (statut ${response.status}).`;

    throw new Error(message);
  }

  // CHECK: Is JSON actually valid?
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("La réponse du serveur n'est pas un JSON valide.");
  }

  return { response, data };
}
```

**Key Features**:
- Checks `Content-Type` header for `application/json`
- Detects HTML responses (typical error page)
- Verifies JSON is actually parseable
- Throws descriptive errors

### Groq API Error Handling (server.js)

#### `classifyGroqError(status, payload)` [Line 340]
```javascript
function classifyGroqError(status, payload) {
  const rawMessage = String(payload?.error?.message || "").toLowerCase();

  // 401: Invalid API key
  if (status === 401 || rawMessage.includes("unauthorized") || 
      rawMessage.includes("invalid api key")) {
    return "Clé API Groq invalide...";
  }

  // 404: Model not found
  if (status === 404 || rawMessage.includes("model") || 
      rawMessage.includes("unknown model")) {
    return "Modèle Groq invalide...";
  }

  // 429: Rate limit exceeded
  if (status === 429 || rawMessage.includes("rate limit") || 
      rawMessage.includes("too many requests") || 
      rawMessage.includes("quota")) {
    return "Limite API atteinte...";
  }

  // 500+: Server error
  if (status >= 500 || rawMessage.includes("connection") || 
      rawMessage.includes("timeout")) {
    return "Problème de connexion avec l'API Groq...";
  }

  return "Erreur API Groq. Vérifie la clé, le modèle et la connexion.";
}
```

---

## 5. TIMER LOGIC

### Voice Silence Detection Timer

**Variable**: `voiceChatSilenceTimer` [Line 19]
- Initialized as `null`

**Set**: Line 703-707 (in `voiceRecognition.onresult`)
```javascript
if (voiceChatSilenceTimer) {
  window.clearTimeout(voiceChatSilenceTimer);  // Clear previous timer
}

voiceChatSilenceTimer = window.setTimeout(async () => {
  voiceChatSilenceTimer = null;
  stopVoiceRecognition(false);
  await processVoiceChatTranscript();  // Send message
}, 7000);  // 7-SECOND DELAY
```

**Clear Scenarios**:
1. Line 700 - before setting new timer
2. Line 757 - in `stopVoiceRecognition(true)`
3. Line 919 - in `stopVoiceChat()`

**Hero Carousel Timer** (unrelated)
- `heroCarouselTimer` [Line 2]
- Used for auto-rotation of hero images on homepage

---

## 6. SUMMARY TABLE

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Menu rendering | ✅ Working | app.js:1262 | Creates UI with 4 actions |
| Menu click detection | ✅ Working | app.js:1050 | Global event listener |
| Rename function | ✅ Frontend ready | app.js:2214 | Calls PATCH (not impl. in backend) |
| Pin function | ✅ Frontend ready | app.js:2253 | Calls PATCH (not impl. in backend) |
| Delete function | ✅ Frontend ready | app.js:2286 | Calls DELETE (not impl. in backend) |
| Share function | ✅ Frontend ready | app.js:2319 | Calls POST (not impl. in backend) |
| Dictation | ✅ Working | app.js:551 | Full pipeline implemented |
| Voice chat | ✅ Working | app.js:641 | Full pipeline with 7s silence timer |
| Translation | ✅ Working | app.js:219 | Calls chat API with prompt |
| safeJsonFetch | ✅ Working | app.js:418 | Checks JSON validity |
| Error classification | ✅ Working | server.js:340 | Groq error handling |
| 7s silence timer | ✅ Working | app.js:703 | Voice chat timeout |

---

## 7. CRITICAL ISSUES

### ⚠️ Missing Backend Endpoints
All conversation action endpoints (PATCH, DELETE, POST for sharing) need to be implemented in server.js:
```javascript
app.patch("/api/conversations/:id", (req, res) => {
  // Implement rename and pin updates
});

app.delete("/api/conversations/:id", (req, res) => {
  // Implement conversation deletion
});

app.post("/api/conversations/:id/share", (req, res) => {
  // Implement share link generation
  // Store in data/shares.json?
});
```

### ✅ Voice & Translation Working
- Dictation mode: fully functional
- Voice chat mode: fully functional with 7-second silence detection
- Translation: using API call with fallback to raw text
- Error handling: comprehensive with safeJsonFetch()
