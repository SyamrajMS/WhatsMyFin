import React from 'react';

const SUGGESTIONS = [
  { label: '🍔 Spent ₹600 on coffee & burgers', text: 'i have bought a cup of cofee in the morning and some burgers costing around 600rs' },
  { label: '📊 How much spent on food this month?', text: 'how much did i spend for food this month' },
  { label: '💡 Financial advice based on habits', text: 'give me advice on my financial habits' },
  { label: '🧾 Show my saved receipts', text: 'show my receipts' },
  { label: '📈 Overall spending breakdown', text: 'show my expenses breakdown with charts' },
  { label: '🚗 Paid ₹320 for Uber cab', text: 'paid 320rs for uber cab to office' },
  { label: '💰 Received ₹65,000 salary', text: 'received 65000 salary for this month' },
];

export default function QuickChips({ onSelectSuggestion }) {
  return (
    <div
      className="quick-chips-bar"
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '8px 12px',
        scrollbarWidth: 'none',
        backgroundColor: 'transparent',
      }}
    >
      {SUGGESTIONS.map((s, idx) => (
        <button
          key={idx}
          onClick={() => onSelectSuggestion(s.text)}
          style={{
            whiteSpace: 'nowrap',
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-input-field)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-wa)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-input-field)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
