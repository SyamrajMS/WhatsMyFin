import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

export default function VoiceRecorder({ onSendAudio, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const liveTranscriptRef = useRef('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mimeType on this browser/phone
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'; // iOS Safari compatibility
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      liveTranscriptRef.current = '';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Web Speech API transcription in background if available
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-IN';

          recognition.onresult = (event) => {
            let currentText = '';
            for (let i = 0; i < event.results.length; i++) {
              currentText += event.results[i][0].transcript + ' ';
            }
            liveTranscriptRef.current = currentText.trim();
          };

          recognition.onerror = () => {};
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Microphone access denied or unpermitted on this host:', err);
      setMicError(true);
      setTimeout(() => setMicError(false), 3000);
    }
  };

  const stopAndSend = () => {
    if (!mediaRecorderRef.current) return;

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }

    mediaRecorderRef.current.onstop = () => {
      const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      const transcript = liveTranscriptRef.current;
      
      onSendAudio(audioBlob, transcript);

      // Stop all tracks
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    liveTranscriptRef.current = '';
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingSeconds(0);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isRecording) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0, 168, 132, 0.4)',
        padding: '6px 12px',
        borderRadius: '24px',
        flex: 1,
        animation: 'fadeIn 0.2s ease-out',
        boxShadow: '0 2px 8px rgba(0, 168, 132, 0.15)'
      }}>
        {/* Cancel button */}
        <button
          onClick={cancelRecording}
          title="Cancel recording"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '6px'
          }}
        >
          <Trash2 size={18} />
        </button>

        {/* Pulsing red dot and recording timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
          }} className="pulsing-record" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
            {formatTime(recordingSeconds)}
          </span>
        </div>

        {/* Animated Sound Wave Bars */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          height: '20px',
          flex: 1,
          justifyContent: 'center',
        }}>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
          <div className="wave-bar"></div>
        </div>

        {/* Send voice message button */}
        <button
          onClick={stopAndSend}
          title="Send voice note"
          style={{
            backgroundColor: 'var(--accent-wa)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 168, 132, 0.3)'
          }}
        >
          <Send size={16} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <button
        onClick={startRecording}
        disabled={disabled}
        title="Tap to record voice message"
        style={{
          backgroundColor: '#00a884',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 5px rgba(0, 168, 132, 0.3)',
          transition: 'transform 0.15s',
        }}
      >
        <Mic size={20} />
      </button>

      {micError && (
        <div style={{
          position: 'absolute',
          bottom: '46px',
          right: '0',
          backgroundColor: '#1f2937',
          color: '#ffffff',
          fontSize: '0.72rem',
          padding: '6px 10px',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 100,
          animation: 'fadeIn 0.2s'
        }}>
          ⚠️ Allow mic in browser address bar
        </div>
      )}
    </div>
  );
}
