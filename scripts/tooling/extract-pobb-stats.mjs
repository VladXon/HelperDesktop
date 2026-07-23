import fs from 'fs';

const html = fs.readFileSync('pobb_page.html', 'utf-8');
const lines = html.split('\n');

lines.forEach((line, i) => {
  const lower = line.toLowerCase();
  if (lower.includes('life') || lower.includes('dps') || lower.includes('resist') || 
      lower.includes('armour') || lower.includes('evasion') || lower.includes('crit') ||
      lower.includes('speed') || lower.includes('mana') || lower.includes('block') ||
      lower.includes('suppression') || lower.includes('armour') || lower.includes('damage')) {
    console.log(i, ':', line.trim().substring(0, 300));
  }
});