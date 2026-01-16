/// <reference types="jest" />
// Mock expo-speech before importing the module that uses it to avoid ESM transform issues
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

// Mock StorageService to avoid native AsyncStorage in tests
jest.mock('../StorageService', () => ({
  storageService: {
    getUserPreferences: async () => ({}),
    saveUserPreference: jest.fn(),
  }
}));

import { VoiceFeedbackManager } from '../VoiceFeedbackManager';
import * as Speech from 'expo-speech';

jest.useFakeTimers();

describe('VoiceFeedbackManager', () => {
  let speakSpy: jest.SpyInstance;
  let stopSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on expo-speech methods (module is mocked above)
    speakSpy = jest.spyOn(Speech as any, 'speak').mockImplementation((text: string, opts?: any) => {
      // Default behaviour: call onDone synchronously so manager clears isSpeaking
      if (opts && typeof opts.onDone === 'function') opts.onDone();
      return;
    });
    stopSpy = jest.spyOn(Speech as any, 'stop').mockImplementation(() => {});
  });

  test('formatMessage sanitizes text', () => {
    const mgr = new VoiceFeedbackManager({ minIntervalMs: 4000, praiseIntervalMs: 6000 });
    expect(mgr.formatMessage('  Move   left hip!!?? ')).toBe('Move left hip');
  });

  test('speakText debounces and respects cooldown', () => {
    const mgr = new VoiceFeedbackManager({ minIntervalMs: 4000, praiseIntervalMs: 6000 });
    mgr.setEnabled(true);

    expect(mgr.speakText('hello', 1)).toBe(true);
    expect(speakSpy).toHaveBeenCalledTimes(1);

    // immediate repeat should be suppressed
    expect(mgr.speakText('hello', 1)).toBe(false);
    expect(speakSpy).toHaveBeenCalledTimes(1);

    // advance time and allow speaking again
    jest.advanceTimersByTime(4000);
    expect(mgr.speakText('hello', 1)).toBe(true);
    expect(speakSpy).toHaveBeenCalledTimes(2);
  });

  test('higher priority cancels ongoing speech', () => {
    const mgr = new VoiceFeedbackManager({ minIntervalMs: 4000, praiseIntervalMs: 6000 });
    mgr.setEnabled(true);

    // First speak will *not* call onDone (simulate long speech)
    (speakSpy as any).mockImplementationOnce(() => {/* long speech, no onDone */});

    expect(mgr.speakText('low priority', 1)).toBe(true);
    expect(speakSpy).toHaveBeenCalledTimes(1);

    // Now request a higher-priority message while "speaking"
    expect(mgr.speakText('urgent!', 2)).toBe(true);
    // stop should be called to cancel the long speech
    expect(stopSpy).toHaveBeenCalled();
    // speak should be called again for the urgent message
    expect(speakSpy).toHaveBeenCalledTimes(2);
  });

  test('cancel stops speech', () => {
    const mgr = new VoiceFeedbackManager({ minIntervalMs: 4000, praiseIntervalMs: 6000 });
    mgr.setEnabled(true);

    expect(mgr.speakText('hello', 1)).toBe(true);
    expect(speakSpy).toHaveBeenCalledTimes(1);

    mgr.cancel();
    // One stop call comes from speakAsync (defensive stop) and one from cancel()
    expect(stopSpy).toHaveBeenCalledTimes(2);
  });

  test('speakText returns false when disabled', () => {
    const mgr = new VoiceFeedbackManager({ minIntervalMs: 4000, praiseIntervalMs: 6000 });
    mgr.setEnabled(false);
    expect(mgr.speakText('won\'t speak', 1)).toBe(false);
    expect(speakSpy).not.toHaveBeenCalled();
  });
});