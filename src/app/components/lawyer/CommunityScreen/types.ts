export type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionEvent = {
  results: SpeechRecognitionResult[];
};

export type SpeechRecognitionResult = {
  [index: number]: { transcript: string };
  isFinal?: boolean;
};

export type SpeechRecognitionErrorEvent = {
  error: string;
};
