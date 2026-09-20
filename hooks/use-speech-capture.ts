import { useCallback, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

/**
 * Long-form Capture dictation. continuous:true so pauses do not end the session;
 * session stops only when the user taps stop (or an error).
 */
export function useSpeechCapture(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wantListenRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const startEngine = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  }, []);

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setError(null);
  });

  useSpeechRecognitionEvent("end", () => {
    // OS may still end a stretch after silence; keep going until user stops.
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

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || event.error === "no-speech") {
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
    setError(event.message || "Could not hear that. Try again or type it in.");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const parts = (event.results ?? [])
      .map((r) => r.transcript?.trim())
      .filter(Boolean);
    const transcript = parts.join(" ").trim();
    if (transcript) onTranscriptRef.current(transcript);
  });

  const start = useCallback(async () => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone access is needed to talk items in.");
      return;
    }

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
