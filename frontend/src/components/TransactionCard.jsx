import React, { useState } from 'react';
import { Check, X, CheckCircle2, XCircle, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { approveTransaction, rejectTransaction } from '../services/api';

const CATEGORY_ICONS = {
  Food: '🍔',
  Travel: '🚗',
  Groceries: '🥦',
  Bills: '⚡',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Health: '💊',
  Salary: '💰',
  Income: '💵',
  Investments: '📈',
  Other: '📦'
};

export default function TransactionCard({ transaction, reply, messageId, onTransactionUpdated }) {
  if (!transaction) return null;

  const initialStatus = transaction.status || (transaction.id ? 'approved' : 'pending');
  const [status, setStatus] = useState(initialStatus);
  const [paymentMode, setPaymentMode] = useState(transaction.payment_mode || 'UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isIncome = transaction.type === 'income';
  const category = transaction.category || 'Other';
  const icon = CATEGORY_ICONS[category] || '💸';
  const amountFormatted = Number(transaction.amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

  const handleApprove = async () => {
    if (isSubmitting || status !== 'pending') return;
    setIsSubmitting(true);
    try {
      const payload = {
        message_id: messageId,
        type: transaction.type || 'expense',
        amount: Number(transaction.amount || 0),
        category: transaction.category || 'Other',
        merchant: transaction.merchant || '',
        description: transaction.description || '',
        date: transaction.date || null,
        currency: transaction.currency || 'INR',
        payment_mode: paymentMode,
        receipt_url: transaction.receipt_url || null,
        receipt_items: transaction.receipt_items || null,
      };

      const result = await approveTransaction(payload);
      setStatus('approved');
      if (onTransactionUpdated) {
        onTransactionUpdated(result.summary);
      }
    } catch (err) {
      console.error('Failed to approve transaction:', err);
      alert('Error approving transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isSubmitting || status !== 'pending') return;
    setIsSubmitting(true);
    try {
      if (messageId) {
        await rejectTransaction(messageId);
      }
      setStatus('rejected');
    } catch (err) {
      console.error('Failed to reject transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      borderRadius: '10px',
      padding: '12px 14px',
      marginTop: '6px',
      minWidth: '250px',
      maxWidth: '100%',
      color: '#000000',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem' }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#000000' }}>
              {transaction.merchant || category}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 500 }}>
              {category}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: isIncome ? '#15803d' : '#dc2626',
          padding: '2px 8px',
          borderRadius: '6px',
          backgroundColor: isIncome ? '#dcfce7' : '#fee2e2'
        }}>
          {isIncome ? '+' : '-'}₹{amountFormatted}
        </div>
      </div>

      {/* Details list */}
      <div style={{
        fontSize: '0.8rem',
        color: '#374151',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        paddingTop: '8px'
      }}>
        {transaction.description && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#6b7280' }}>Note:</span>
            <span style={{ color: '#000000', fontStyle: 'italic', fontWeight: 500 }}>{transaction.description}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4b5563' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={12} /> {transaction.date || 'Today'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CreditCard size={12} /> Mode: <strong>{paymentMode}</strong>
          </span>
        </div>
      </div>

      {/* Payment Mode Selector (UPI vs Cash) */}
      {status === 'pending' && (
        <div style={{
          marginTop: '10px',
          padding: '8px 10px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>
            Payment Mode:
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setPaymentMode('UPI')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: paymentMode === 'UPI' ? '1.5px solid #00a884' : '1px solid #d1d5db',
                backgroundColor: paymentMode === 'UPI' ? '#e6f7f3' : '#f9fafb',
                color: paymentMode === 'UPI' ? '#008069' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ UPI
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setPaymentMode('Cash')}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: paymentMode === 'Cash' ? '1.5px solid #00a884' : '1px solid #d1d5db',
                backgroundColor: paymentMode === 'Cash' ? '#e6f7f3' : '#f9fafb',
                color: paymentMode === 'Cash' ? '#008069' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              💵 Cash
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons: Side-by-side Approve & Reject */}
      {status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '9px 12px',
              backgroundColor: '#00a884',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0, 168, 132, 0.25)',
              transition: 'background-color 0.15s ease'
            }}
          >
            {isSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
            Approve
          </button>

          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '9px 12px',
              backgroundColor: '#ffffff',
              color: '#dc2626',
              border: '1.5px solid #fca5a5',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <X size={16} />
            Reject
          </button>
        </div>
      )}

      {/* Confirmed / Approved Badge */}
      {status === 'approved' && (
        <div style={{
          marginTop: '10px',
          padding: '7px 10px',
          backgroundColor: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem',
          color: '#15803d',
          fontWeight: 700
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={15} /> Approved & Added to DB
          </span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#bbf7d0',
            color: '#166534',
            fontWeight: 600
          }}>
            {paymentMode}
          </span>
        </div>
      )}

      {/* Discarded / Rejected Badge */}
      {status === 'rejected' && (
        <div style={{
          marginTop: '10px',
          padding: '7px 10px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.78rem',
          color: '#b91c1c',
          fontWeight: 600
        }}>
          <XCircle size={15} /> Discarded (Not saved)
        </div>
      )}
    </div>
  );
}
