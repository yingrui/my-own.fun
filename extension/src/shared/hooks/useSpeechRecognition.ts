import { useCallback, useEffect, useRef, useState } from "react";

function getSpeechRecognition(): typeof window.SpeechRecognition | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  supported: boolean;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const {
    lang = "en-US",
    continuous = true,
    interimResults = true,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const SpeechRecognition = getSpeechRecognition();
  const recognitionRef = useRef<InstanceType<NonNullable<typeof SpeechRecognition>> | null>(null);

  const supported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    try {
      const recognition = new SR();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }
        if (final) {
          setTranscript((prev) => (prev + final).trim());
          setInterimTranscript("");
        }
        if (interim) {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          // Chrome suppresses mic prompt in sidepanel; inject iframe into active tab
          if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: "inject_microphone_permission" }, (res) => {
              if (chrome.runtime.lastError) {
                onError?.(
                  "Could not connect. Reload the extension and try again, or open a webpage (e.g. google.com) first."
                );
                return;
              }
              if (res?.ok) {
                onError?.(
                  "A permission dialog appeared. Switch to the tab that opened, click Allow, then try the mic again."
                );
              } else if (res?.reason === "no_http_tab") {
                onError?.(
                  "Could not find a suitable tab. Open a webpage (e.g. google.com) and try again."
                );
              } else {
                onError?.(
                  `Microphone access denied. ${res?.reason || "Open a webpage (e.g. google.com) and try again."}`
                );
              }
            });
          } else {
            onError?.("Microphone access denied. Please allow microphone access in your browser.");
          }
        } else if (event.error === "no-speech") {
          onError?.("No speech detected");
        } else {
          onError?.(`Speech recognition error: ${event.error}`);
        }
      };

      setTranscript("");
      setInterimTranscript("");
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to start speech recognition");
    }
  }, [supported, continuous, interimResults, lang, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    supported,
  };
}
