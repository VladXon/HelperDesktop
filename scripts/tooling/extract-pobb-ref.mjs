import fs from 'fs';

const html = fs.readFileSync('pobb_page.html', 'utf-8');

// Extract stats from the meta description and page content
// Pattern: "Life : 3,882 129% Mana : 44 eHP : 39,176 Phys Max Hit : 10,156 Fire Max Hit : 36,270 Cold Max Hit : 37,614 Lightning Max Hit : 36,270 Chaos Max Hit : 40,623 Resistances : 75%/76%/75%/75% Evade : 83% Evasion : 28,949 DPS : 672,923 Speed : 6.17 Hit Rate : 1.37 Hit Chance : 97% Crit Chance : 56.97% Crit Multi : 691%"

const statsRegex = /Life\s*:\s*([\d,]+)\s*(\d+)%\s*Mana\s*:\s*([\d,]+)\s*eHP\s*:\s*([\d,]+)\s*Phys Max Hit\s*:\s*([\d,]+)\s*Fire Max Hit\s*:\s*([\d,]+)\s*Cold Max Hit\s*:\s*([\d,]+)\s*Lightning Max Hit\s*:\s*([\d,]+)\s*Chaos Max Hit\s*:\s*([\d,]+)\s*Resistances\s*:\s*([\d%\/]+)\s*Evade\s*:\s*([\d%]+)\s*Evasion\s*:\s*([\d,]+)\s*DPS\s*:\s*([\d,]+)\s*Speed\s*:\s*([\d.]+)\s*Hit Rate\s*:\s*([\d.]+)\s*Hit Chance\s*:\s*([\d%]+)\s*Crit Chance\s*:\s*([\d.%]+)\s*Crit Multi\s*:\s*([\d%]+)/i;

const match = html.match(statsRegex);
if (match) {
  console.log('=== PoB Community Reference Stats ===');
  console.log('Life:', match[1], '(', match[2], '%)');
  console.log('Mana:', match[3]);
  console.log('eHP:', match[4]);
  console.log('Phys Max Hit:', match[5]);
  console.log('Fire Max Hit:', match[6]);
  console.log('Cold Max Hit:', match[7]);
  console.log('Lightning Max Hit:', match[8]);
  console.log('Chaos Max Hit:', match[9]);
  console.log('Resistances:', match[10]);
  console.log('Evade:', match[11]);
  console.log('Evasion:', match[12]);
  console.log('DPS:', match[13]);
  console.log('Speed:', match[14]);
  console.log('Hit Rate:', match[15]);
  console.log('Hit Chance:', match[16]);
  console.log('Crit Chance:', match[17]);
  console.log('Crit Multi:', match[18]);
} else {
  console.log('No match found');
}

// Also extract from the page content
const lines = html.split('\n');
lines.forEach((line, i) => {
  if (line.includes('Life :') || line.includes('DPS :') || line.includes('Resistances :') || 
      line.includes('Evade :') || line.includes('Evasion :') || line.includes('Crit') ||
      line.includes('Speed :') || line.includes('Hit Chance') || line.includes('Crit Multi') ||
      line.includes('Hit Rate') || line.includes('Mana :') || line.includes('eHP') ||
      line.includes('Max Hit') || line.includes('Armour')) {
    console.log('\nLine', i, ':', line.trim().substring(0, 500));
  }
});