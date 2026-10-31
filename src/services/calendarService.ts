import { RecurringBill } from '../types/budget';
import { formatMoney, getCurrencySymbol } from './currencyService';

export async function downloadBillsCalendarICS(bills: RecurringBill[], currency: string = 'INR'): Promise<void> {
  try {
    const res = await fetch('/api/calendar/generate-ics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bills }),
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kashflow_budget_schedule.ics';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
  } catch (err) {
    console.warn('ICS generation API error, using client ICS generator:', err);
  }

  // Client-side ICS generator fallback
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KashFlow Budget//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:KashFlow Budget & Bills',
  ];

  bills.forEach((bill, i) => {
    const dStr = bill.dueDate.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:kashflow-${i}-${bill.dueDate}@kashflow.app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dStr}`);
    lines.push(`SUMMARY:Bill Due: ${bill.title} (${formatMoney(bill.amount, currency)})`);
    lines.push(`DESCRIPTION:Payment reminder for ${bill.title} due on ${bill.dueDate}.`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kashflow_budget_schedule.ics';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function createGoogleCalendarUrl(bill: RecurringBill, currency: string = 'INR'): string {
  const formattedAmt = formatMoney(bill.amount, currency);
  const title = encodeURIComponent(`Bill Due: ${bill.title} (${formattedAmt})`);
  const details = encodeURIComponent(
    `Payment reminder for ${bill.title} of ${formattedAmt}.\nCategory: ${bill.category}\nScheduled via KashFlow Budget Manager.`
  );
  const due = bill.dueDate.replace(/-/g, '');
  // Format for all-day event in Google Calendar: YYYYMMDD/YYYYMMDD
  const dates = `${due}/${due}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
}
