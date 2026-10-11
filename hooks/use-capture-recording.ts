import { transcribeCaptureAudio } from '@/services/api';
import { Audio } from 'expo-av';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

const METERING_INTERVAL_MS = 60;

function recordingOptions(): Audio.RecordingOptions {
  return {
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  };
}

function detachMetering(active: Audio.Recording | null) {
  active?.setOnRecordingStatusUpdate(null);
}

export function useCaptureRecording(): {
  recording: boolean;
  transcribing: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<string | null>;
  clearError: () => void;
  meteringDb: SharedValue<number>;
  meteringTick: SharedValue<number>;
} {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const startingRef = useRef(false);
  const focusedRef = useRef(false);
  const meteringDb = useSharedValue(-160);
  const meteringTick = useSharedValue(0);

  const onStatus = useCallback(
    (status: Audio.RecordingStatus) => {
      if (!focusedRef.current || !status.isRecording) return;
      if (typeof status.metering !== 'number' || !Number.isFinite(status.metering)) return;
      meteringDb.value = status.metering;
      meteringTick.value += 1;
    },
    [meteringDb, meteringTick]
  );

  const releaseRecording = useCallback(async () => {
    const active = recordingRef.current;
    recordingRef.current = null;
    detachMetering(active);
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

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      const active = recordingRef.current;
      if (active) {
        active.setProgressUpdateInterval(METERING_INTERVAL_MS);
        active.setOnRecordingStatusUpdate(onStatus);
      }
      return () => {
        focusedRef.current = false;
        detachMetering(recordingRef.current);
      };
    }, [onStatus])
  );

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
        recordingOptions(),
        onStatus,
        METERING_INTERVAL_MS
      );
      recordingRef.current = next;
      next.setProgressUpdateInterval(METERING_INTERVAL_MS);
      if (!focusedRef.current) detachMetering(next);
      setRecording(true);
    } catch {
      await releaseRecording();
      setRecording(false);
      setError('Could not start recording. Try again or type it in.');
    } finally {
      startingRef.current = false;
    }
  }, [onStatus, releaseRecording]);

  const stop = useCallback(async (): Promise<string | null> => {
    const active = recordingRef.current;
    recordingRef.current = null;
    detachMetering(active);
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

  return { recording, transcribing, error, start, stop, clearError, meteringDb, meteringTick };
}
