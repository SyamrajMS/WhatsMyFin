import React, { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  Send,
  Smile,
  Mic,
  ArrowDown,
  Sparkles,
  Bot,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

import Sidebar from './components/Sidebar';
import ChatHeader from './components/ChatHeader';
import MessageBubble from './components/MessageBubble';
import VoiceRecorder from './components/VoiceRecorder';
import QuickChips from './components/QuickChips';
import ReceiptModal from './components/ReceiptModal';
import SettingsModal from './components/SettingsModal';

import {
  fetchChatHistory,
  sendTextMessage,
  sendVoiceMessage,
  sendReceiptImage,
  fetchAnalytics
} from './services/api';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [summary, setSummary] = useState({});
  const [activeChat, setActiveChat] = useState('finchat');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('finchat_theme') || 'light');

  // WhatsApp-style image preview & caption before upload
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [pendingUploadPreview, setPendingUploadPreview] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Set theme on body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('finchat_theme', theme);
  }, [theme]);

  // Load initial messages and summary
  useEffect(() => {
    loadChatData();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadChatData = async () => {
    try {
      const historyData = await fetchChatHistory();
      setMessages(historyData.history || []);
      const summaryData = await fetchAnalytics();
      setSummary(summaryData || {});
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  // Trigger confetti for income or savings achievement
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00a884', '#22c55e', '#3b82f6', '#f59e0b']
      });
    } catch (e) {
      // ignore
    }
  };

  const handleTransactionUpdated = (newSummary) => {
    if (newSummary) {
      setSummary(newSummary);
      if (newSummary.last_type === 'income') {
        triggerConfetti();
      }
    } else {
      fetchAnalytics().then(setSummary).catch(console.error);
    }
  };

  // Send Text Message
  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    if (!textToSend) setInputText('');

    // Optimistically add user message with black text
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      message_type: 'text',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      const res = await sendTextMessage(text);
      if (res.reply) {
        setMessages((prev) => [...prev, res.reply]);
        if (res.parsed?.transaction?.type === 'income') {
          triggerConfetti();
        }
      }
      // Refresh summary
      const updatedSummary = await fetchAnalytics();
      setSummary(updatedSummary);
    } catch (err) {
      console.error('Failed to send text:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          message_type: 'text',
          content: '⚠️ Sorry, could not process that message. Please verify the backend server.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Send Voice Message with Speech Audio Output
  const handleSendVoice = async (audioBlob, transcript) => {
    if (!audioBlob || isTyping) return;

    // Temporary optimistic voice message (audio clip only)
    const tempVoice = {
      id: Date.now(),
      sender: 'user',
      message_type: 'voice',
      content: '', // No text clutter on voice clip
      media_url: URL.createObjectURL(audioBlob),
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempVoice]);
    setIsTyping(true);

    try {
      const res = await sendVoiceMessage(audioBlob, transcript);
      if (res.reply) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempVoice.id);
          const userVoiceMsg = {
            id: Date.now() - 1,
            sender: 'user',
            message_type: 'voice',
            content: '', // Audio voice clip only, identical to WhatsApp
            media_url: URL.createObjectURL(audioBlob),
            timestamp: new Date().toISOString()
          };
          return [...filtered, userVoiceMsg, res.reply];
        });

        // Automatically play the AI's spoken voice note reply!
        const voiceUrl = res.voice_reply_url || res.reply?.media_url;
        if (voiceUrl) {
          const hostname = window.location.hostname || '127.0.0.1';
          const fullAudioUrl = voiceUrl.startsWith('http') ? voiceUrl : `http://${hostname}:8000${voiceUrl}`;
          const audio = new Audio(fullAudioUrl);
          audio.play().catch((e) => console.log('Autoplay audio notice:', e));
        } else if ('speechSynthesis' in window && res.reply?.content) {
          const clean = res.reply.content.replace(/[*#_`~•]/g, '').replace(/₹/g, ' rupees ');
          const utter = new SpeechSynthesisUtterance(clean);
          utter.lang = 'en-IN';
          window.speechSynthesis.speak(utter);
        }
      }
      const updatedSummary = await fetchAnalytics();
      setSummary(updatedSummary);
    } catch (err) {
      console.error('Failed to process voice note:', err);
    } finally {
      setIsTyping(false);
    }
  };

  // Select Receipt Image -> Open WhatsApp Caption & Preview Modal
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || isTyping) return;

    e.target.value = '';
    setPendingUploadFile(file);
    setPendingUploadPreview(URL.createObjectURL(file));
    setUploadCaption('');
  };

  // Confirm sending receipt image with caption
  const handleConfirmUpload = async () => {
    if (!pendingUploadFile || isTyping) return;
    const file = pendingUploadFile;
    const caption = uploadCaption.trim();
    const preview = pendingUploadPreview;

    setPendingUploadFile(null);
    setPendingUploadPreview(null);
    setUploadCaption('');

    const tempImgMsg = {
      id: Date.now(),
      sender: 'user',
      message_type: 'receipt',
      content: caption || 'Uploaded receipt photo 🧾',
      media_url: preview,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempImgMsg]);
    setIsTyping(true);

    try {
      const res = await sendReceiptImage(file, caption);
      if (res.reply) {
        setMessages((prev) => {
          // Replace tempImgMsg with user_message if returned, plus add reply
          const filtered = prev.filter((m) => m.id !== tempImgMsg.id);
          const finalUserMsg = res.user_message || tempImgMsg;
          return [...filtered, finalUserMsg, res.reply];
        });
      }
      const updatedSummary = await fetchAnalytics();
      setSummary(updatedSummary);
    } catch (err) {
      console.error('Failed to upload receipt:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-container">
      {/* 1. Left Sidebar (responsive drawer on mobile) */}
      <Sidebar
        summary={summary}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickAction={(text) => handleSend(text)}
        lastMessage={messages[messages.length - 1]}
        isOpenOnMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main WhatsApp Chat Area */}
      <main className="main-chat-container">
        {/* Fixed Chat Header */}
        <ChatHeader
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          summary={summary}
          isTyping={isTyping}
        />

        {/* Message Stream */}
        <div className="wa-chat-pattern chat-messages-stream">
          {/* Messages list with dynamic WhatsApp date separators */}
          {messages.map((msg, index) => {
            const getMsgDateLabel = (dateVal) => {
              if (!dateVal) return 'TODAY';
              try {
                const clean = typeof dateVal === 'string' ? dateVal.replace(' ', 'T') : dateVal;
                const d = new Date(clean);
                if (isNaN(d.getTime())) return 'TODAY';
                const today = new Date();
                if (d.toDateString() === today.toDateString()) return 'TODAY';
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
              } catch {
                return 'TODAY';
              }
            };

            const currentLabel = getMsgDateLabel(msg.created_at || msg.timestamp);
            const prevLabel = index > 0 ? getMsgDateLabel(messages[index - 1].created_at || messages[index - 1].timestamp) : null;
            const showDatePill = index === 0 || currentLabel !== prevLabel;

            return (
              <React.Fragment key={msg.id || index}>
                {showDatePill && (
                  <div style={{
                    alignSelf: 'center',
                    backgroundColor: 'var(--bg-chat-header)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '8px',
                    margin: '14px 0 8px',
                    boxShadow: 'var(--shadow-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {currentLabel}
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  onOpenReceipt={(data) => setSelectedReceipt(data)}
                  onTransactionUpdated={handleTransactionUpdated}
                />
              </React.Fragment>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div
              className="chat-bubble chat-bubble-incoming animate-fade-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 14px',
                marginBottom: '10px',
                width: 'fit-content'
              }}
            >
              <div className="wave-bar" style={{ height: '8px' }}></div>
              <div className="wave-bar" style={{ height: '14px' }}></div>
              <div className="wave-bar" style={{ height: '10px' }}></div>
              <span style={{ fontSize: '0.8rem', color: '#000000', marginLeft: '6px', fontWeight: 600 }}>
                WhatsMyFin AI is thinking...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <QuickChips onSelectSuggestion={(text) => handleSend(text)} />

        {/* Chat Input Bar */}
        <footer className="chat-footer-bar">
          {/* Emoji button */}
          <button
            title="Emojis"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <Smile size={22} />
          </button>

          {/* File Attachment (Bills / Receipts) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach Bill or Receipt Photo"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <Paperclip size={22} />
          </button>

          {/* Text Input Field */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <input
              type="text"
              placeholder="Text expense, e.g. 'spent 600rs on food' or ask..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input-field)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#000000', // Black input text font
                fontSize: '16px', // Prevents mobile browser auto-zoom
                outline: 'none',
              }}
            />
          </div>

          {/* Voice recorder or Send button */}
          {inputText.trim() ? (
            <button
              onClick={() => handleSend()}
              disabled={isTyping}
              title="Send text message"
              style={{
                backgroundColor: 'var(--accent-wa)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Send size={17} />
            </button>
          ) : (
            <VoiceRecorder
              onSendAudio={handleSendVoice}
              disabled={isTyping}
            />
          )}
        </footer>
      </main>

      {/* Lightbox / Modal for Viewing Scanned Receipts */}
      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        data={selectedReceipt}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        onDataReset={loadChatData}
      />

      {/* WhatsApp-Style Photo Preview & Caption Modal */}
      {pendingUploadFile && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(11, 20, 26, 0.96)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          {/* Header */}
          <div style={{
            width: '100%',
            maxWidth: '650px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            color: '#ffffff'
          }}>
            <button
              type="button"
              onClick={() => {
                setPendingUploadFile(null);
                setPendingUploadPreview(null);
                setUploadCaption('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Cancel"
            >
              <X size={24} />
            </button>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e9edef' }}>
              Send Bill Photo
            </span>
            <div style={{ width: '40px' }} />
          </div>

          {/* Centered Image Preview */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%',
            maxHeight: '68vh',
            overflow: 'hidden',
            padding: '12px'
          }}>
            <img
              src={pendingUploadPreview}
              alt="Bill Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '68vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
              }}
            />
          </div>

          {/* Bottom Caption Input Bar & WhatsApp Send Button */}
          <div style={{
            width: '100%',
            maxWidth: '650px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 0 24px'
          }}>
            <div style={{
              flex: 1,
              backgroundColor: '#202c33',
              borderRadius: '24px',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}>
              <input
                type="text"
                autoFocus
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmUpload();
                  }
                }}
                placeholder="Add a caption... (e.g. this is the food bill i had today it cost 4000 rs)"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#e9edef',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleConfirmUpload}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0, 168, 132, 0.4)',
                flexShrink: 0
              }}
              title="Send bill"
            >
              <Send size={19} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
