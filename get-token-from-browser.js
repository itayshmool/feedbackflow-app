// Run this in your browser console while logged into staging
// https://feedbackflow-frontend-staging.onrender.com

console.log('\n=== FeedbackFlow Staging Token ===\n');

// Method 1: From cookie
const cookies = document.cookie.split(';');
const tokenCookie = cookies.find(c => c.trim().startsWith('token='));

if (tokenCookie) {
  const token = tokenCookie.split('=')[1];
  console.log('✅ Token found!');
  console.log('\nYour token:');
  console.log(token);
  console.log('\nCopy the token above and run:');
  console.log(`node test-prompt-injection.js "${token}"`);
} else {
  console.log('❌ No token found in cookies');
  console.log('Make sure you are logged in to staging');
}

// Method 2: From localStorage (backup)
const localToken = localStorage.getItem('token') || localStorage.getItem('authToken');
if (localToken && !tokenCookie) {
  console.log('\n✅ Token found in localStorage!');
  console.log(localToken);
}

console.log('\n===================================\n');






