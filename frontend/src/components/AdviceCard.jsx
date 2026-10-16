import React from 'react';
import { Lightbulb, ShieldCheck } from 'lucide-react';

export default function AdviceCard({ advice }) {
  if (!advice) return null;

  const title = advice.title || 'Financial Habits & Advice 💡';
  const summary = advice.summary || '';
  const tips = advice.tips || [];
  const metrics = advice.metrics || {};

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      borderRadius: '12px',
      padding: '14px',
      marginTop: '8px',
      minWidth: '240px',
      maxWidth: '100%',
      color: '#000000'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d97706',
        }}>
          <Lightbulb size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000000' }}>
            {title}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
            AI Spending Habit Analysis
          </div>
        </div>
      </div>

      {summary && (
        <div style={{ fontSize: '0.82rem', color: '#1f2937', marginBottom: '10px', fontWeight: 500 }}>
          {summary}
        </div>
      )}

      {/* Metrics Banner */}
      {metrics.savings_rate && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          padding: '8px 10px',
          marginBottom: '10px',
          fontSize: '0.78rem'
        }}>
          <span style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <ShieldCheck size={14} color="#059669" /> Estimated Savings Rate
          </span>
          <span style={{ fontWeight: 700, color: '#047857' }}>
            {metrics.savings_rate}
          </span>
        </div>
      )}

      {/* Tips list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tips.map((tip, idx) => (
          <div key={idx} style={{
            fontSize: '0.82rem',
            lineHeight: '1.45',
            color: '#000000', // Black font color
            padding: '8px 10px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            borderLeft: '3px solid #f59e0b',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}
