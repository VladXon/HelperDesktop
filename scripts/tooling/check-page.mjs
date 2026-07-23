import fs from 'fs';

const html = fs.readFileSync('pobb_page.html', 'utf-8');
console.log('Length:', html.length);
console.log('First 200 chars:', html.substring(0, 200));