import React, { useState, useRef } from 'react';
import { Play, Pause, CheckCheck, FileText, ExternalLink, Volume2, VolumeX, Bot } from 'lucide-react';
import TransactionCard from './TransactionCard';
import ChartCard from './ChartCard';
import AdviceCard from './AdviceCard';
import { getFullMediaUrl } from '../services/api';

export default function MessageBubble({ message, onOpenReceipt, onTransactionUpdated }) {
  const isUser = message.sender === 'user';
  const meta = message.metadata || {};
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const audioUrl = message.media_url || meta.voice_reply_url;
  const isAudioMessage = Boolean(
    message.message_type === 'voice' ||
    meta.voice_reply_url ||
    (audioUrl && (audioUrl.includes('.webm') || audioUrl.includes('.mp3') || audioUrl.includes('.ogg') || audioUrl.includes('.wav')))
  );

  const displayImageUrl = message.media_url || meta.receipt_url || (meta.receipt && meta.receipt.receipt_url);
  const isImageMessage = Boolean(
    displayImageUrl && (
      message.message_type === 'receipt' ||
      message.message_type === 'image' ||
      message.message_type === 'receipt_image' ||
      displayImageUrl.includes('.jpg') ||
      displayImageUrl.includes('.jpeg') ||
      displayImageUrl.includes('.png') ||
      displayImageUrl.includes('.webp')
    )
  );

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Fallback: browser Text-to-Speech if no audio file
    if ('speechSynthesis' in window && message.content) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        const clean = message.content.replace(/[*#_`~•]/g, '').replace(/₹/g, ' rupees ');
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = 'en-IN';
        utter.onend = () => setIsPlaying(false);
        utter.onerror = () => setIsPlaying(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utter);
      }
    }
  };

  const formatTime = (ts) => {
    const timeVal = ts || message.timestamp || message.created_at;
    if (!timeVal) return '';
    try {
      const clean = typeof timeVal === 'string' ? timeVal.replace(' ', 'T') : timeVal;
      const d = new Date(clean);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#000000', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i} style={{ color: '#000000' }}>{part}</span>;
    });
  };

  return (
    <div
      className={`chat-bubble ${isUser ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'} animate-fade-in`}
      style={{
        marginBottom: '10px',
        color: '#000000',
      }}
    >
      {/* 1. Voice Note Player (User Voice Note or AI Spoken Reply) */}
      {isAudioMessage && audioUrl && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 2px',
          minWidth: '220px',
        }}>
          <audio
            ref={audioRef}
            src={getFullMediaUrl(audioUrl)}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />

          {/* WhatsApp Play/Pause Button */}
          <button
            onClick={toggleAudio}
            title={isPlaying ? "Pause voice note" : "Play voice note"}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: isUser ? '#00a884' : '#00a884',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>

          {/* Sound wave visualizer */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px', height: '22px' }}>
            {[10, 16, 8, 20, 14, 18, 9, 15, 22, 12, 16, 8, 14, 18].map((h, i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  backgroundColor: isPlaying ? '#0284c7' : '#00a884',
                  borderRadius: '2px',
                }}
              />
            ))}
          </div>

          <button
            onClick={toggleAudio}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            {isPlaying ? <VolumeX size={16} color="#dc2626" /> : <Volume2 size={16} color="#4b5563" />}
          </button>
        </div>
      )}

      {/* 2. WhatsApp Image Preview (both outgoing and incoming receipts/images) */}
      {isImageMessage && displayImageUrl && (
        <div
          onClick={() => onOpenReceipt && onOpenReceipt({ media_url: displayImageUrl, ...meta })}
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '6px',
            cursor: 'pointer',
            maxWidth: '310px',
            backgroundColor: '#0000000a',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            position: 'relative'
          }}
          title="Click to view full photo"
        >
          <img
            src={getFullMediaUrl(displayImageUrl)}
            alt="Bill receipt"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '340px',
              objectFit: 'contain',
              display: 'block',
              backgroundColor: '#f3f4f6'
            }}
          />
        </div>
      )}

      {/* 3. Text Content - Crisp Black Color (Hide text for user voice notes so it is clean voice clip only) */}
      {(!isAudioMessage || !isUser) && message.content && (
        <div style={{
          whiteSpace: 'pre-wrap',
          fontSize: '0.92rem',
          lineHeight: '1.45',
          color: '#000000',
          position: 'relative'
        }}>
          {renderFormattedText(message.content)}
        </div>
      )}

      {/* 4. Rich Interactive Cards */}
      {message.message_type === 'transaction_card' && meta.transaction && (
        <TransactionCard
          transaction={meta.transaction}
          reply={meta.reply}
          messageId={message.id}
          onTransactionUpdated={onTransactionUpdated}
        />
      )}

      {message.message_type === 'chart_card' && (
        <ChartCard metadata={meta} />
      )}

      {message.message_type === 'advice_card' && meta.advice && (
        <AdviceCard advice={meta.advice} />
      )}

      {message.message_type === 'receipt_card' && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
          padding: '10px 12px',
          marginTop: '6px',
          maxWidth: '320px',
          color: '#000000'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#000000' }}>
              🧾 {meta.merchant || 'Scanned Receipt'}
            </span>
            <span style={{ fontWeight: 700, color: '#00a884', fontSize: '0.95rem' }}>
              ₹{Number(meta.total || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {meta.items && meta.items.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: '#374151', marginBottom: '8px' }}>
              {meta.items.slice(0, 3).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>• {it.name || it.description}</span>
                  <span style={{ fontWeight: 600 }}>₹{it.price}</span>
                </div>
              ))}
              {meta.items.length > 3 && (
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontStyle: 'italic', marginTop: '2px' }}>
                  +{meta.items.length - 3} more items...
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => onOpenReceipt && onOpenReceipt(meta)}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 168, 132, 0.15)',
              border: 'none',
              color: '#00a884',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              marginBottom: meta.transaction ? '8px' : '0'
            }}
          >
            <ExternalLink size={13} /> View Full Receipt & Items
          </button>

          {meta.transaction && (
            <TransactionCard
              transaction={meta.transaction}
              reply={meta.reply}
              messageId={message.id}
              onTransactionUpdated={onTransactionUpdated}
            />
          )}
        </div>
      )}

      {message.message_type === 'receipts_list' && meta.receipts && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '10px',
          padding: '10px',
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '340px'
        }}>
          {meta.receipts.map((rec, i) => (
            <div
              key={i}
              onClick={() => onOpenReceipt && onOpenReceipt(rec)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 168, 132, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00a884'
                }}>
                  <FileText size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#000000' }}>
                    {rec.merchant || 'Store Receipt'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                    {rec.date} • {rec.category}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 700, color: '#000000', fontSize: '0.85rem' }}>
                ₹{Number(rec.amount).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bubble Metadata Footer: Speaker button, Timestamp & Blue Double Ticks */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '6px',
        marginTop: '4px',
        fontSize: '0.68rem',
        color: '#4b5563',
      }}>
        {/* Speaker button on AI replies to listen anytime */}
        {!isUser && (
          <button
            onClick={toggleAudio}
            title={isPlaying ? "Stop audio" : "Listen to speech"}
            style={{
              background: 'transparent',
              border: 'none',
              color: isPlaying ? '#00a884' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
              borderRadius: '4px'
            }}
          >
            <Volume2 size={13} />
            <span style={{ fontSize: '0.65rem', marginLeft: '2px', fontWeight: 600 }}>
              {isPlaying ? 'Playing...' : 'Listen'}
            </span>
          </button>
        )}

        <span>{formatTime(message.timestamp)}</span>
        {isUser && <CheckCheck size={14} color="#0284c7" />}
      </div>
    </div>
  );
}
