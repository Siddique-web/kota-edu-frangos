import { receiptText, type Order } from '@kota/shared';

/** Imprime um talão térmico (80mm) através de um iframe invisível. */
export function printTicket(order: Order) {
  const text = receiptText(order, 42)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Talão ${order.number}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    body { margin: 0; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.35; color: #000; }
    pre { margin: 0; white-space: pre-wrap; }
  </style></head><body><pre>${text}</pre></body></html>`;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 1500);
  }, 150);
}

export function printText(title: string, text: string) {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{margin:16px;font-family:'Courier New',monospace;font-size:13px;line-height:1.4;color:#000}pre{margin:0;white-space:pre-wrap}</style>
  </head><body><pre>${safe}</pre></body></html>`;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => document.body.removeChild(frame), 1500);
  }, 150);
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
