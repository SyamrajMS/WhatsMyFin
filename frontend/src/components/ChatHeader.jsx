import React from 'react';
import { Menu, Sparkles, Bot, Shield, MoreVertical, Wallet } from 'lucide-react';

export default function ChatHeader({ onOpenSettings, onOpenSidebar, summary, isTyping }) {
  const totalExpense = summary?.total_expense || 0;
  const totalIncome = summary?.total_income || 0;

  const formatAmount = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return Number(num).toLocaleString('en-IN');
  };

  return (
    <header
      className="fixed-chat-header"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '62px',
        minHeight: '62px',
        backgroundColor: 'var(--bg-chat-header)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Contact Info & Mobile Menu Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Mobile Menu Drawer Toggle Button */}
        <button
          className="mobile-only"
          onClick={onOpenSidebar}
          title="Open Chats & Financial Summary"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex'
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00a884, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0, 168, 132, 0.3)'
        }}>
          <Bot size={20} color="#ffffff" />
          <span style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            border: '2px solid var(--bg-chat-header)'
          }} />
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 700,
            fontSize: '0.94rem',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            WhatsMyFin AI
            <span style={{ color: '#00a884', display: 'flex' }} title="Verified Financial Companion">
              <Sparkles size={13} fill="#00a884" />
            </span>
          </div>

          <div style={{
            fontSize: '0.72rem',
            color: isTyping ? 'var(--accent-wa)' : 'var(--text-secondary)',
            fontWeight: isTyping ? 700 : 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isTyping ? 'typing...' : 'online • Financial Assistant'}
          </div>
        </div>
      </div>

      {/* Header action buttons: Live Income & Expense Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Real-time Income & Expense Badge (Starts at 0, updates live with transactions) */}
        <button
          onClick={onOpenSidebar}
          title="Income & Expense Live Total - Tap to view details"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '18px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '0.72rem',
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}
        >
          {/* Income Tracker */}
          <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '0.62rem', color: '#16a34a' }}>IN</span>
            +₹{formatAmount(totalIncome)}
          </span>

          <span style={{ width: '1px', height: '10px', backgroundColor: 'rgba(0,0,0,0.15)' }} />

          {/* Expense Tracker */}
          <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '0.62rem', color: '#ef4444' }}>OUT</span>
            -₹{formatAmount(totalExpense)}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
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
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
}
