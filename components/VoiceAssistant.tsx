
import React, { useState, useEffect, useRef } from 'react';
import { Mic, X, Loader2, Wand2 } from 'lucide-react';
import { interpretVoiceCommand } from '../services/gemini';
import { VoiceAction } from '../types';

interface VoiceAssistantProps {
  onAction: (action: VoiceAction) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'de-DE';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setProcessing(true);
        
        const action = await interpretVoiceCommand(text);
        if (action) {
            onAction(action);
            setIsOpen(false);
            setTranscript('');
        } else {
            alert("Konnte das nicht verstehen.");
        }
        setProcessing(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onAction]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      recognitionRef.current?.start();
    }
  };

  const openAssistant = () => {
      setIsOpen(true);
      setTimeout(() => toggleListening(), 500); // Auto start
  }

  if (!isOpen) {
      return (
          <button 
            onClick={openAssistant}
            className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-xl flex items-center justify-center text-white z-40 transition hover:scale-110 active:scale-95"
          >
              <Mic size={24} />
          </button>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in pb-20">
        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 shadow-2xl animate-slide-up relative">
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                <X size={24} />
            </button>

            <div className="flex flex-col items-center space-y-6 pt-4">
                <div className="relative">
                    {processing ? (
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center animate-pulse">
                            <Wand2 size={32} className="text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
                        </div>
                    ) : (
                        <button 
                            onClick={toggleListening}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 shadow-red-500/50 shadow-lg animate-pulse' : 'bg-blue-600 shadow-blue-600/50 shadow-lg'}`}
                        >
                            <Mic size={32} className="text-white" />
                        </button>
                    )}
                </div>

                <div className="text-center min-h-[60px]">
                    {processing ? (
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">Denke nach...</p>
                    ) : (
                        <>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">
                                {transcript || (isListening ? "Ich höre zu..." : "Tippen zum Sprechen")}
                            </p>
                            {!transcript && <p className="text-xs text-gray-400 mt-2">Sag "Setz Milch auf die Liste" oder "Plan Abendessen"</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default VoiceAssistant;
