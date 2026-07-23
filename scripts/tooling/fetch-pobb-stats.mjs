import fs from 'fs';
import https from 'https';

async function fetchBuildStats(buildId) {
  return new Promise((resolve, reject) => {
    https.get(`https://pobb.in/${buildId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract stats from the HTML
        const stats = {
          life: extractStat(data, 'Life'),
          energyShield: extractStat(data, 'Energy Shield'),
          armour: extractStat(data, 'Armour'),
          evasion: extractStat(data, 'Evasion'),
          fireResist: extractStat(data, 'Fire Resistance'),
          coldResist: extractStat(data, 'Cold Resistance'),
          lightningResist: extractStat(data, 'Lightning Resistance'),
          chaosResist: extractStat(data, 'Chaos Resistance'),
          block: extractStat(data, 'Block'),
          spellSuppression: extractStat(data, 'Spell Suppression'),
          totalDps: extractStat(data, 'Total DPS'),
          hitDps: extractStat(data, 'Hit DPS'),
          dotDps: extractStat(data, 'DoT DPS'),
          critChance: extractStat(data, 'Crit Chance'),
          critMultiplier: extractStat(data, 'Crit Multiplier'),
          attackSpeed: extractStat(data, 'Attack Speed'),
          castSpeed: extractStat(data, 'Cast Speed'),
          mana: extractStat(data, 'Mana'),
          reservation: extractStat(data, 'Reservation'),
        };
        resolve(stats);
      });
    }).on('error', reject);
  });
}

function extractStat(html, label) {
  // Look for patterns like "Life: 5,123" or "Life 5,123"
  const patterns = [
    new RegExp(`${label}[^\\d]*(\\d[\\d,.]*)`, 'i'),
    new RegExp(`${label.toLowerCase()}[^\\d]*(\\d[\\d,.]*)`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  return null;
}

async function main() {
  const buildId = 'qO1_QpuQLeDd';
  console.log(`Fetching stats for ${buildId}...`);
  
  try {
    const stats = await fetchBuildStats('qO1_QpuQLeDd');
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main().catch(console.error);