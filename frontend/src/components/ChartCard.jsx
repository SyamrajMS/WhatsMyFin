import React from 'react';
import { PieChart } from 'lucide-react';

const PALETTE = [
  '#00a884', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#059669', '#0891b2', '#ea580c'
];

export default function ChartCard({ metadata }) {
  if (!metadata) return null;

  const isCategoryDetail = metadata.type === 'category_detail';
  const summary = metadata.summary || {};
  const category = metadata.category || '';
  const total = metadata.total || 0;
  const count = metadata.count || 0;
  const items = metadata.items || [];

  const categories = summary.by_category || [];
  const totalExpense = summary.total_expense || total || 0;

  let cumulativeAngle = 0;
  const slices = categories.map((cat, idx) => {
    const fraction = totalExpense > 0 ? (cat.total / totalExpense) : 0;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      name: cat.category,
      amount: cat.total,
      fraction,
      percent: Math.round(fraction * 100),
      color: PALETTE[idx % PALETTE.length],
      startAngle,
      angle
    };
  });

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '12px',
      padding: '14px',
      marginTop: '8px',
      minWidth: '240px',
      maxWidth: '100%',
      color: '#000000'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 168, 132, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00a884'
          }}>
            <PieChart size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#000000' }}>
              {isCategoryDetail ? `${category} Spending` : 'Monthly Financial Breakdown'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
              This Month's Analytics
            </div>
          </div>
        </div>

        {/* Total pill */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Total Spent</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626' }}>
            ₹{totalExpense.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Category detail view */}
      {isCategoryDetail ? (
        <div>
          <div style={{
            padding: '8px 10px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '8px',
            marginBottom: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.82rem', color: '#4b5563' }}>Transactions</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#000000' }}>{count} logged</span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '6px', fontWeight: 700 }}>
            RECENT PURCHASES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '6px',
                fontSize: '0.8rem'
              }}>
                <div>
                  <div style={{ color: '#000000', fontWeight: 600 }}>
                    {item.merchant || item.description || category}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {item.date}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#dc2626' }}>
                  ₹{Number(item.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Full Month Overview View */
        <div>
          {/* Summary Metric Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div style={{ padding: '8px 10px', backgroundColor: '#dcfce7', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>Total Income</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#15803d' }}>
                ₹{(summary.total_income || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ padding: '8px 10px', backgroundColor: '#e0f2fe', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 600 }}>Net Savings</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0369a1' }}>
                ₹{(summary.net_savings || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Category Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {slices.map((slice, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px' }}>
                  <span style={{ color: '#000000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: slice.color }}></span>
                    {slice.name}
                  </span>
                  <span style={{ color: '#374151', fontWeight: 700 }}>
                    ₹{slice.amount.toLocaleString('en-IN')} ({slice.percent}%)
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${slice.percent}%`,
                    height: '100%',
                    backgroundColor: slice.color,
                    borderRadius: '3px',
                    transition: 'width 0.6s ease'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
