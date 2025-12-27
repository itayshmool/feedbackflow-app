#!/usr/bin/env node
/**
 * Fetch Author Images from Wikipedia
 * 
 * Uses Wikipedia API to fetch portrait images for quote authors.
 * Updates quotes.json with image URLs.
 * 
 * Usage: node scripts/fetch-author-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const QUOTES_PATH = path.join(__dirname, '../database/seeds/quotes.json');
const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

// Rate limiting - Wikipedia asks for max 200 requests/second, we'll be conservative
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWikipediaImage(authorName) {
  return new Promise((resolve) => {
    // Clean up author name for Wikipedia search
    const searchName = authorName
      .replace(/\s+/g, '_')
      .replace(/['']/g, "'");
    
    const url = `${WIKIPEDIA_API}${encodeURIComponent(searchName)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'FeedbackFlow-QuoteBot/1.0 (educational project)'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          
          const json = JSON.parse(data);
          
          // Get the thumbnail or original image
          if (json.thumbnail && json.thumbnail.source) {
            // Get a larger version by modifying the URL
            let imageUrl = json.thumbnail.source;
            // Try to get 200px version instead of default small size
            imageUrl = imageUrl.replace(/\/\d+px-/, '/200px-');
            resolve(imageUrl);
          } else if (json.originalimage && json.originalimage.source) {
            resolve(json.originalimage.source);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

// Some authors need special Wikipedia page names
const AUTHOR_WIKIPEDIA_MAP = {
  'Will Durant': 'Will_Durant',
  'Lao Tzu': 'Laozi',
  'Confucius': 'Confucius',
  'Marcus Aurelius': 'Marcus_Aurelius',
  'Seneca': 'Seneca_the_Younger',
  'Epictetus': 'Epictetus',
  'Leonardo da Vinci': 'Leonardo_da_Vinci',
  'Benjamin Franklin': 'Benjamin_Franklin',
  'Thomas Edison': 'Thomas_Edison',
  'Albert Einstein': 'Albert_Einstein',
  'Winston Churchill': 'Winston_Churchill',
  'Martin Luther King Jr.': 'Martin_Luther_King_Jr.',
  'Nelson Mandela': 'Nelson_Mandela',
  'Viktor Frankl': 'Viktor_Frankl',
  'Friedrich Nietzsche': 'Friedrich_Nietzsche',
  'Johann Wolfgang von Goethe': 'Johann_Wolfgang_von_Goethe',
  'Steve Jobs': 'Steve_Jobs',
  'Bill Gates': 'Bill_Gates',
  'Elon Musk': 'Elon_Musk',
  'Henry Ford': 'Henry_Ford',
  'Theodore Roosevelt': 'Theodore_Roosevelt',
  'Michael Jordan': 'Michael_Jordan',
  'Muhammad Ali': 'Muhammad_Ali',
  'Helen Keller': 'Helen_Keller',
  'Mark Twain': 'Mark_Twain',
  'Ralph Waldo Emerson': 'Ralph_Waldo_Emerson',
  'Walt Disney': 'Walt_Disney',
  'Michelangelo': 'Michelangelo',
  'Socrates': 'Socrates',
  'Plato': 'Plato',
  'Aristotle': 'Aristotle',
  'Heraclitus': 'Heraclitus',
};

async function main() {
  console.log('📖 Loading quotes...');
  const quotes = JSON.parse(fs.readFileSync(QUOTES_PATH, 'utf8'));
  
  // Get unique authors
  const authors = [...new Set(quotes.map(q => q.author))];
  console.log(`👥 Found ${authors.length} unique authors\n`);
  
  const authorImages = {};
  let found = 0;
  let notFound = 0;
  
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    const wikiName = AUTHOR_WIKIPEDIA_MAP[author] || author;
    
    process.stdout.write(`[${i + 1}/${authors.length}] ${author}... `);
    
    const imageUrl = await fetchWikipediaImage(wikiName);
    
    if (imageUrl) {
      authorImages[author] = imageUrl;
      console.log('✅');
      found++;
    } else {
      console.log('❌ not found');
      notFound++;
    }
    
    // Rate limiting
    await sleep(DELAY_MS);
  }
  
  console.log(`\n📊 Results: ${found} found, ${notFound} not found`);
  
  // Update quotes with image URLs
  console.log('\n📝 Updating quotes.json...');
  const updatedQuotes = quotes.map(quote => ({
    ...quote,
    authorImageUrl: authorImages[quote.author] || null
  }));
  
  fs.writeFileSync(QUOTES_PATH, JSON.stringify(updatedQuotes, null, 2));
  
  console.log('✅ Done! quotes.json updated with image URLs');
  
  // Summary
  const withImages = updatedQuotes.filter(q => q.authorImageUrl).length;
  console.log(`\n📈 ${withImages}/${updatedQuotes.length} quotes now have author images`);
  
  // List authors without images
  const missingAuthors = authors.filter(a => !authorImages[a]);
  if (missingAuthors.length > 0) {
    console.log('\n⚠️  Authors without images:');
    missingAuthors.forEach(a => console.log(`   - ${a}`));
  }
}

main().catch(console.error);

