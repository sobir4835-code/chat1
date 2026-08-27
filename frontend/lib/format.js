export function formatLastSeen(iso) {
  if (!iso) return 'oxirgi marta ko\'rilgan vaqt noma\'lum';

  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  const time = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  if (diffMin < 1) return 'hozirgina onlayn edi';
  if (diffMin < 60) return `${diffMin} daqiqa oldin onlayn edi`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `bugun ${time} da onlayn edi`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) return `kecha ${time} da onlayn edi`;

  const dateStr = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dateStr}, ${time} da onlayn edi`;
}
