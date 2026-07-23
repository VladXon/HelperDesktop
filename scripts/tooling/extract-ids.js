const fs = require('fs');

const html = fs.readFileSync('user_page.html', 'utf-8');
console.log('Length:', html.length);

const regex = /\/u\/paintmaster\/([a-zA-Z0-9_-]+)/g;
const ids = new Set();
let match;
while ((match = regex.exec(html)) !== null) {
  ids.add(match[1]);
}

console.log('Found', ids.size, 'build IDs:');
[...ids].forEach(id => console.log(id));

// Save to file
fs.writeFileSync('build_ids.txt', [...ids].join('\n'));