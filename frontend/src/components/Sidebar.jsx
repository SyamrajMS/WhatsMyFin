import React, { useState } from 'react';
import {
  Receipt,
  PieChart,
  Lightbulb,
  Settings,
  Search,
  CheckCheck,
  ShieldCheck,
  Sparkles,
  Bot,
  X,
  Wallet
} from 'lucide-react';

export default function Sidebar({
  summary,
  activeChat,
  setActiveChat,
  onOpenSettings,
  onQuickAction,
  lastMessage,
  isOpenOnMobile,
  onCloseMobile
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const totalExpense = summary.total_expense || 0;
  const totalIncome = summary.total_income || 0;
  const netSavings = summary.net_savings || (totalIncome - totalExpense);

  const CHATS = [
    {
      id: 'finchat',
      name: 'WhatsMyFin AI',
      subtitle: lastMessage?.content?.slice(0, 36) || 'Voice & Receipt enabled',
      time: lastMessage ? new Date(lastMessage.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '14:30',
      badge: 'Bot',
      avatarIcon: <Bot size={20} color="#ffffff" />,
      avatarBg: 'linear-gradient(135deg, #00a884, #059669)',
      verified: true
    },
    {
      id: 'receipts',
      name: '🧾 Bill & Receipt Vault',
      subtitle: 'View scanned receipts & invoices',
      time: 'Vault',
      avatarIcon: <Receipt size={18} color="#ffffff" />,
      avatarBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      action: 'show my receipts'
    },
    {
      id: 'analytics',
      name: '📊 Financial Analytics',
      subtitle: 'Spending breakdown & trends',
      time: 'Report',
      avatarIcon: <PieChart size={18} color="#ffffff" />,
      avatarBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      action: 'show my expenses breakdown with charts'
    },
    {
      id: 'advisor',
      name: '💡 Smart Budget Advisor',
      subtitle: 'Habit analysis & savings tips',
      time: 'AI',
      avatarIcon: <Lightbulb size={18} color="#ffffff" />,
      avatarBg: 'linear-gradient(135deg, #ec4899, #db2777)',
      action: 'give me advice on my financial habits'
    }
  ];

  const filteredChats = CHATS.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpenOnMobile ? 'mobile-open' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={`sidebar-container ${isOpenOnMobile ? 'mobile-open' : ''}`}>
        {/* Top Profile / Action Bar */}
        <div style={{
          height: '60px',
          backgroundColor: 'var(--bg-chat-header)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {/* User avatar & name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '0.9rem'
            }}>
              SR
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Syamraj
              </div>
              <div style={{ fontSize: '0.7rem', color: '#00a884', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00a884' }} />
                Active Wallet
              </div>
            </div>
          </div>

          {/* Action icons & Mobile Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={onOpenSettings}
              title="Settings & API Key"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings size={18} />
            </button>

            {/* Mobile close button */}
            <button
              className="mobile-only"
              onClick={onCloseMobile}
              title="Close drawer"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Financial Health Ribbon */}
        <div style={{
          padding: '10px 12px',
          backgroundColor: 'rgba(0, 168, 132, 0.08)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          textAlign: 'center'
        }}>
          <div style={{ padding: '6px 2px', borderRadius: '6px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Income</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>
              ₹{totalIncome >= 1000 ? `${(totalIncome/1000).toFixed(0)}k` : totalIncome}
            </div>
          </div>
          <div style={{ padding: '6px 2px', borderRadius: '6px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Spent</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626' }}>
              ₹{totalExpense >= 1000 ? `${(totalExpense/1000).toFixed(1)}k` : totalExpense}
            </div>
          </div>
          <div style={{ padding: '6px 2px', borderRadius: '6px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Saved</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00a884' }}>
              ₹{netSavings >= 1000 ? `${(netSavings/1000).toFixed(1)}k` : netSavings}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            backgroundColor: 'var(--bg-input-field)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 10px',
            gap: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search or ask query..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Chats List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.map((chat) => {
            const isSelected = activeChat === chat.id;
            return (
              <div
                key={chat.id}
                onClick={() => {
                  setActiveChat(chat.id);
                  if (chat.action) {
                    onQuickAction(chat.action);
                  }
                  if (onCloseMobile) {
                    onCloseMobile();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--bg-chat-header)' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: chat.avatarBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative'
                }}>
                  {chat.avatarIcon}
                  {chat.id === 'finchat' && (
                    <span style={{
                      position: 'absolute',
                      bottom: '1px',
                      right: '1px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      border: '2px solid var(--bg-sidebar)'
                    }} />
                  )}
                </div>

                {/* Chat info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {chat.name}
                      {chat.verified && (
                        <span style={{ color: '#00a884', display: 'flex' }}>
                          <Sparkles size={13} fill="#00a884" />
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {chat.time}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {chat.id === 'finchat' && <CheckCheck size={13} color="var(--accent-blue-tick)" />}
                    {chat.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Info note */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-chat-header)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <ShieldCheck size={13} color="#00a884" /> Encrypted SQLite DB
        </div>
      </aside>
    </>
  );
}
