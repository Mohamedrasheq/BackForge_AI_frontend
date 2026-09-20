import { transcribeCaptureAudio } from '@/services/api';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

export function useCaptureRecording() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startingRef = useRef(false);

  const releaseRecording = useCallback(async () => {
    const active = recordingRef.current;
    recordingRef.current = null;
    if (active) {
      try {
        await active.stopAndUnloadAsync();
      } catch {
        // already stopped
      }
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {
      // audio session reset is best-effort
    }
  }, []);

  useEffect(() => {
    return () => {
      void releaseRecording();
    };
  }, [releaseRecording]);

  const start = useCallback(async () => {
    if (recordingRef.current || startingRef.current) return;
    startingRef.current = true;
    setError(null);
    Keyboard.dismiss();

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is needed to talk items in.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: next } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = next;
      setRecording(true);
    } catch {
      await releaseRecording();
      setRecording(false);
      setError('Could not start recording. Try again or type it in.');
    } finally {
      startingRef.current = false;
    }
  }, [releaseRecording]);

  const stop = useCallback(async (): Promise<string | null> => {
    const active = recordingRef.current;
    recordingRef.current = null;
    if (!active) {
      setRecording(false);
      return null;
    }

    setRecording(false);
    setTranscribing(true);
    setError(null);

    try {
      try {
        await active.stopAndUnloadAsync();
      } catch {
        // Recorder may already be unloaded; still try to read the file.
      }
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch {
        // ignore session reset
      }

      const uri = active.getURI();
      if (!uri) {
        setError('Could not save that recording. Try again or type it in.');
        return null;
      }

      const transcript = (await transcribeCaptureAudio(uri)).trim();
      if (!transcript) {
        setError('Could not hear that. Try again or type it in.');
        return null;
      }

      return transcript;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not transcribe that. Try again or type it in.');
      return null;
    } finally {
      setTranscribing(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { recording, transcribing, error, start, stop, clearError };
}
