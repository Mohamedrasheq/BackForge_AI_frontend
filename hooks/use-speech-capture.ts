import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

/**
 * Long-form Capture dictation.
 * - continuous:true so short pauses do not end recognition
 * - committed finals + current interim (latest segment only — no cumulative join)
 * - if iOS ends the session while mic still wanted, restart and keep committed text
 */
export function useSpeechCapture(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wantListenRef = useRef(false);
  const committedRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const publish = useCallback((interim = '') => {
    const next = [committedRef.current, interim].filter(Boolean).join(' ').trim();
    onTranscriptRef.current(next);
  }, []);

  const startEngine = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (wantListenRef.current) {
      try {
        startEngine();
        return;
      } catch {
        // fall through
      }
    }
    setListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted' || event.error === 'no-speech') {
      if (wantListenRef.current) {
        try {
          startEngine();
          return;
        } catch {
          // fall through
        }
      }
      setListening(false);
      return;
    }
    wantListenRef.current = false;
    setListening(false);
    setError(event.message || 'Could not hear that. Try again or type it in.');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const results = event.results ?? [];
    if (results.length === 0) return;

    // Latest segment only — joining all results duplicates cumulative transcripts.
    const latest = results[results.length - 1];
    const chunk = latest?.transcript?.trim() ?? '';
    if (!chunk) return;

    const isFinal = Boolean(
      (event as { isFinal?: boolean }).isFinal ??
        (latest as { isFinal?: boolean }).isFinal
    );

    if (isFinal) {
      committedRef.current = [committedRef.current, chunk]
        .filter(Boolean)
        .join(' ')
        .trim();
      publish('');
    } else {
      publish(chunk);
    }
  });

  const start = useCallback(async () => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone access is needed to talk items in.');
      return;
    }

    committedRef.current = '';
    wantListenRef.current = true;
    startEngine();
  }, [startEngine]);

  const stop = useCallback(() => {
    wantListenRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
    }
  }, []);

  return { listening, error, start, stop };
}
