#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

with open('public/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the voiceRecognition.onresult handler
old_handler = '''  voiceRecognition.onresult = (event) => {
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
    updateVoiceChatPanel('Je t\'écoute... Parle librement.', rawTranscript || 'En cours de reconnaissance...');

    if (voiceChatSilenceTimer) {
      window.clearTimeout(voiceChatSilenceTimer);
    }

    voiceChatSilenceTimer = window.setTimeout(async () => {
      voiceChatSilenceTimer = null;
      stopVoiceRecognition(false);
      await processVoiceChatTranscript();
    }, 7000);
  };'''

new_handler = '''  voiceRecognition.onresult = (event) => {
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
    
    // Display raw transcript with translation if available
    let displayPanel = rawTranscript || 'En cours de reconnaissance...';
    if (latestVoiceTranslatedText) {
      displayPanel = 'Reconnu: ' + rawTranscript + '\\n\\nTraduit: ' + latestVoiceTranslatedText;
    }
    updateVoiceChatPanel('Je t\'écoute... Parle librement.', displayPanel);

    if (voiceChatSilenceTimer) {
      window.clearTimeout(voiceChatSilenceTimer);
    }

    // Also trigger translation with debounce (separate from silence timer)
    if (rawTranscript && rawTranscript !== latestVoiceRecognizedText) {
      latestVoiceRecognizedText = rawTranscript;
      
      // Cancel previous translation timer
      if (voiceChatTranslationTimer) {
        window.clearTimeout(voiceChatTranslationTimer);
      }

      // Schedule new translation after 2000ms of stability
      voiceChatTranslationTimer = window.setTimeout(async () => {
        voiceChatTranslationTimer = null;
        
        const recognizedText = latestVoiceRecognizedText;
        if (recognizedText) {
          try {
            const translated = await translateVoiceInputToResponseLanguage(recognizedText);
            if (translated && translated !== recognizedText) {
              latestVoiceTranslatedText = translated;
              const displayWithTranslation = 'Reconnu: ' + recognizedText + '\\n\\nTraduit: ' + translated;
              updateVoiceChatPanel('Je t\'écoute... Traduction disponible.', displayWithTranslation);
            }
          } catch (error) {
            console.warn('Traduction chat vocal échouée:', error);
          }
        }
      }, 2000);
    }

    // Set silence timer for auto-send (7 seconds, separate from translation timer)
    voiceChatSilenceTimer = window.setTimeout(async () => {
      voiceChatSilenceTimer = null;
      stopVoiceRecognition(false);
      await processVoiceChatTranscript();
    }, 7000);
  };'''

if old_handler in content:
    print("✓ Found old handler, replacing...")
    content = content.replace(old_handler, new_handler)
    print("✓ Replacement successful")
else:
    print("⚠ Old handler pattern not found exactly")

# Also ensure stopVoiceRecognition clears the translation timer
old_stop = '''function stopVoiceRecognition(allowRestart = true) {
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
}'''

new_stop = '''function stopVoiceRecognition(allowRestart = true) {
  voiceChatShouldRestart = allowRestart;
  if (voiceChatSilenceTimer) {
    window.clearTimeout(voiceChatSilenceTimer);
    voiceChatSilenceTimer = null;
  }
  if (voiceChatTranslationTimer) {
    window.clearTimeout(voiceChatTranslationTimer);
    voiceChatTranslationTimer = null;
  }
  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (error) {
      console.warn(error);
    }
  }
}'''

if old_stop in content:
    print("✓ Found stopVoiceRecognition, updating...")
    content = content.replace(old_stop, new_stop)
    print("✓ stopVoiceRecognition updated")
else:
    print("⚠ stopVoiceRecognition not found exactly")

# Update stopVoiceChat to also clear translation timers
old_chat_stop = '''function stopVoiceChat() {
  const voiceButton = document.querySelector('.composer-voice');
  if (voiceButton) {
    voiceButton.classList.remove('listening');
  }

  if (voiceChatSilenceTimer) {
    window.clearTimeout(voiceChatSilenceTimer);
    voiceChatSilenceTimer = null;
  }

  stopVoiceRecognition(false);
  voiceChatActive = false;
  voiceMode = null;
  voiceChatTranscript = '';
  voiceChatInterim = '';
  hideVoiceChatPanel();
}'''

new_chat_stop = '''function stopVoiceChat() {
  const voiceButton = document.querySelector('.composer-voice');
  if (voiceButton) {
    voiceButton.classList.remove('listening');
  }

  if (voiceChatSilenceTimer) {
    window.clearTimeout(voiceChatSilenceTimer);
    voiceChatSilenceTimer = null;
  }

  if (voiceChatTranslationTimer) {
    window.clearTimeout(voiceChatTranslationTimer);
    voiceChatTranslationTimer = null;
  }

  stopVoiceRecognition(false);
  voiceChatActive = false;
  voiceMode = null;
  voiceChatTranscript = '';
  voiceChatInterim = '';
  latestVoiceRecognizedText = '';
  latestVoiceTranslatedText = '';
  hideVoiceChatPanel();
}'''

if old_chat_stop in content:
    print("✓ Found stopVoiceChat, updating...")
    content = content.replace(old_chat_stop, new_chat_stop)
    print("✓ stopVoiceChat updated")
else:
    print("⚠ stopVoiceChat not found exactly")

# Write back
with open('public/app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✓ All modifications complete!")
