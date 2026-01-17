import * as Speech from 'expo-speech';
import { storageService } from './StorageService';

export type Analysis = {
  score?: number;
  isCorrect?: boolean;
  feedback?: string[]; // suggestions
  mistakes?: string[]; // higher priority corrections
  color?: 'green' | 'yellow' | 'red' | 'white';
};

type Priority = 0 | 1 | 2; // 2 = error, 1 = correction, 0 = praise

export class VoiceFeedbackManager {
  private enabled = true;
  private lastMessage: string | null = null;
  private lastSpokenAt = 0;
  private isSpeaking = false;
  private minIntervalMs = 4000; // throttle between messages (4s minimum)
  private praiseIntervalMs = 6000; // praise is less frequent
  private lastPriority: Priority = 0;

  constructor(opts?: { minIntervalMs?: number; praiseIntervalMs?: number }) {
    if (opts?.minIntervalMs) this.minIntervalMs = opts.minIntervalMs;
    if (opts?.praiseIntervalMs) this.praiseIntervalMs = opts.praiseIntervalMs;

    // load persisted preference non-blocking
    (async () => {
      try {
        const prefs = await storageService.getUserPreferences();
        if (prefs && typeof prefs.voiceEnabled !== 'undefined') {
          this.enabled = !!prefs.voiceEnabled;
        }
      } catch (e) {
        // ignore
      }
    })();
  }

  setEnabled(flag: boolean) {
    this.enabled = !!flag;
    try { storageService.saveUserPreference('voiceEnabled', this.enabled); } catch { }
    if (!this.enabled) {
      try { this.cancel(); } catch { }
    }
  }
  isEnabled() { return this.enabled; }

  /**
   * Speak a pre-computed message string (single source of truth for UI + TTS).
   * Returns true if speech was initiated, false if suppressed by throttling/dedup.
   */
  speakText(message: string, priority: Priority = 1): boolean {
    if (!this.enabled || !message) return false;

    const text = this.sanitizeMessage(message);
    if (!text) return false;

    const now = Date.now();
    const interval = priority === 0 ? this.praiseIntervalMs : this.minIntervalMs;

    // Dedup: don't speak same message too frequently
    if (text === this.lastMessage && now - this.lastSpokenAt < interval) return false;
    // Priority guard: only allow equal/lower priority after interval
    if (priority <= this.lastPriority && now - this.lastSpokenAt < interval) return false;

    // If higher priority, cancel ongoing speech immediately
    if (priority > this.lastPriority && this.isSpeaking) {
      try { Speech.stop(); } catch { }
    }

    this.speakAsync(text, priority);
    return true;
  }

  /**
   * Cancel any ongoing speech immediately.
   */
  cancel() {
    try {
      Speech.stop();
    } catch { }
    this.isSpeaking = false;
    // reset priority to neutral
    if (this.lastPriority > 0) this.lastPriority = 0;
  }

  // Backwards-compatible wrapper (avoid calling in frame loops - prefer speakText)
  handleAnalysis(analysis: Analysis | null) {
    if (!this.enabled || !analysis) return;

    const { message, priority } = this.chooseMessageAndPriority(analysis);
    if (!message) return;

    this.speakText(message, priority);
  }

  private chooseMessageAndPriority(analysis: Analysis): { message: string | null; priority: Priority } {
    if (analysis.mistakes && analysis.mistakes.length > 0) {
      return { message: this.sanitizeMessage(analysis.mistakes[0]), priority: 2 };
    }
    if (analysis.feedback && analysis.feedback.length > 0) {
      return { message: this.sanitizeMessage(analysis.feedback[0]), priority: 1 };
    }
    if (analysis.isCorrect || (typeof analysis.score === 'number' && analysis.score > 85)) {
      return { message: 'Good form, keep going.', priority: 0 };
    }
    return { message: null, priority: 0 };
  }

  private sanitizeMessage(raw: string) {
    const trimmed = (raw || '').trim();
    const short = trimmed.length > 120 ? trimmed.slice(0, 117) + '...' : trimmed;
    // Preserve whitespace but remove disallowed punctuation/characters
    return short.replace(/\s+/g, ' ').replace(/[^\w\s.,'”\-]/g, '');
  }

  /**
   * Public formatter to normalize text for both UI and speech. Use this to
   * ensure the spoken text exactly matches what is displayed to the user.
   */
  formatMessage(raw: string) {
    return this.sanitizeMessage(raw);
  }

  private speakAsync(text: string, priority: Priority) {
    if (!text) return;
    this.isSpeaking = true;
    this.lastMessage = text;
    this.lastSpokenAt = Date.now();
    this.lastPriority = priority;

    try { Speech.stop(); } catch { }

    try {
      Speech.speak(text, {
        onDone: () => {
          this.isSpeaking = false;
          if (this.lastPriority > 0) this.lastPriority = 0;
        },
        onStopped: () => {
          this.isSpeaking = false;
          if (this.lastPriority > 0) this.lastPriority = 0;
        },
        onError: () => {
          this.isSpeaking = false;
          if (this.lastPriority > 0) this.lastPriority = 0;
        }
      });
    } catch (e) {
      this.isSpeaking = false;
    }
  }
}

export const voiceManager = new VoiceFeedbackManager({ minIntervalMs: 4000, praiseIntervalMs: 6000 });
export default voiceManager;
