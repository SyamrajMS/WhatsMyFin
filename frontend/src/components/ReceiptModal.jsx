import React from 'react';
import { X, Receipt, Download, Calendar, Store, Tag } from 'lucide-react';
import { getFullMediaUrl } from '../services/api';

export default function ReceiptModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const imageUrl = getFullMediaUrl(data.receipt_url || data.media_url);
  const items = data.items || (data.metadata && data.metadata.items) || [];
  const merchant = data.merchant || (data.metadata && data.metadata.merchant) || 'Receipt';
  const total = data.total || (data.metadata && data.metadata.total) || data.amount || 0;
  const date = data.date || (data.metadata && data.metadata.date) || 'Recent';
  const category = data.category || (data.metadata && data.metadata.category) || 'Expense';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 168, 132, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-wa)'
            }}>
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {merchant}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {category} • {date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body: Split View between Image & Extracted Line Items */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: imageUrl ? '1fr 1fr' : '1fr',
          gap: '16px',
          padding: '20px',
          overflowY: 'auto',
        }}>
          {/* Bill Photo */}
          {imageUrl && (
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)',
              position: 'relative'
            }}>
              <img
                src={imageUrl}
                alt="Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          {/* Extracted Details & Line items */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 168, 132, 0.1)',
              borderRadius: '10px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Paid</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-wa)' }}>
                ₹{Number(total).toLocaleString('en-IN')}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              SCANNED LINE ITEMS ({items.length || 1})
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '220px',
              overflowY: 'auto',
            }}>
              {items.length > 0 ? (
                items.map((it, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '6px',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {it.name || it.description || 'Item'}
                      {it.qty ? ` (x${it.qty})` : ''}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{Number(it.price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px' }}>
                  Total purchase logged to {category}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.85rem'
              }}
            >
              <Download size={15} /> Open Full Image
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-wa)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
