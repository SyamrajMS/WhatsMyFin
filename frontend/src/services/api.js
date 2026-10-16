const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
const BASE_URL = `http://${hostname}:8000`;

export async function fetchChatHistory() {
  const res = await fetch(`${BASE_URL}/api/chat/history`);
  if (!res.ok) throw new Error('Failed to load chat history');
  return res.json();
}

export async function sendTextMessage(message) {
  const res = await fetch(`${BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function sendVoiceMessage(audioBlob, transcript) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  if (transcript) {
    formData.append('transcript', transcript);
  }
  
  const res = await fetch(`${BASE_URL}/api/chat/voice`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to process voice note');
  return res.json();
}

export async function sendReceiptImage(file, caption) {
  const formData = new FormData();
  formData.append('image', file);
  if (caption && caption.trim()) {
    formData.append('caption', caption.trim());
  }

  const res = await fetch(`${BASE_URL}/api/chat/receipt`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to scan receipt image');
  return res.json();
}

export async function fetchAnalytics(month) {
  const url = month ? `${BASE_URL}/api/analytics/summary?month=${month}` : `${BASE_URL}/api/analytics/summary`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchTransactions(category) {
  const url = category ? `${BASE_URL}/api/transactions?category=${encodeURIComponent(category)}` : `${BASE_URL}/api/transactions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function approveTransaction(payload) {
  const res = await fetch(`${BASE_URL}/api/transactions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to approve transaction');
  return res.json();
}

export async function rejectTransaction(messageId) {
  const res = await fetch(`${BASE_URL}/api/transactions/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId }),
  });
  if (!res.ok) throw new Error('Failed to reject transaction');
  return res.json();
}

export async function seedDemoData() {
  const res = await fetch(`${BASE_URL}/api/seed`, { method: 'POST' });
  return res.json();
}

export async function resetAllData() {
  const res = await fetch(`${BASE_URL}/api/reset`, { method: 'POST' });
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${BASE_URL}/api/settings`);
  return res.json();
}

export async function updateSettings(settings) {
  const res = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return res.json();
}

export function getFullMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
}
