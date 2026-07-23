import fs from 'fs';

const html = fs.readFileSync('pobb_page.html', 'utf-8');

// Find all script tags
const scripts = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/g);
if (scripts) {
  console.log('External scripts:');
  scripts.forEach(s => console.log(s));
}

// Also look for inline scripts
const inline = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
if (inline) {
  console.log('\nAll inline scripts:');
  inline.forEach((s, i) => {
    console.log('\nInline script', i, ':');
    console.log(s.substring(0, 200));
  });
}