/**
 * Direct test for whatDoYouNeedFromMe bug
 * This script tests the real-database-server.ts directly
 */

const http = require('http');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data || '{}')
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing whatDoYouNeedFromMe persistence bug\n');
  
  // Use an existing test user
  const testEmail = 'amnons@wix.com';
  console.log('Using test email:', testEmail);
  
  // Step 1: Mock login to get auth token
  console.log('\nStep 1: Getting auth token via mock login...');
  const loginResponse = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login/mock',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testEmail,
    name: 'WDYNFM Test User',
    password: 'test123'
  });
  
  console.log('Login status:', loginResponse.status);
  
  // Extract cookies from set-cookie header
  const cookies = loginResponse.headers['set-cookie'];
  const authCookie = cookies?.find(c => c.startsWith('authToken='));
  const csrfCookie = cookies?.find(c => c.startsWith('csrf-token='));
  
  if (!authCookie) {
    console.error('❌ Failed to get auth cookie');
    console.log('Response:', loginResponse.body);
    process.exit(1);
  }
  
  const authToken = authCookie.split(';')[0];
  const csrfToken = csrfCookie ? csrfCookie.split(';')[0].split('=')[1] : null;
  
  console.log('✅ Got auth token:', authToken.substring(0, 50) + '...');
  console.log('✅ Got CSRF token:', csrfToken ? csrfToken.substring(0, 20) + '...' : 'MISSING');
  
  // Step 2: Create feedback WITH whatDoYouNeedFromMe
  console.log('\nStep 2: Creating feedback with whatDoYouNeedFromMe...');
  const testWhatDoYouNeedFromMe = 'TEST BUG: I need weekly 1:1 meetings - timestamp: ' + Date.now();
  const testBottomLine = 'TEST BUG: Keep up the great work - timestamp: ' + Date.now();
  
  const requestBody = {
    toUserEmail: testEmail, // Self-assessment
    reviewType: 'self_assessment',
    content: {
      overallComment: 'Test feedback for whatDoYouNeedFromMe bug investigation',
      strengths: ['Test strength'],
      areasForImprovement: ['Test area'],
      recommendations: ['Test recommendation'],
      whatDoYouNeedFromMe: testWhatDoYouNeedFromMe,
      bottomLine: testBottomLine,
      confidential: false,
    },
  };
  
  console.log('Request body being sent:');
  console.log(JSON.stringify(requestBody, null, 2));
  
  const createResponse = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/feedback',
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': `${authToken}; csrf-token=${csrfToken}`,
      'x-csrf-token': csrfToken
    }
  }, requestBody);
  
  console.log('\nCreate status:', createResponse.status);
  
  if (createResponse.status !== 201) {
    console.error('❌ Failed to create feedback');
    console.log('Response:', JSON.stringify(createResponse.body, null, 2));
    process.exit(1);
  }
  
  const feedbackId = createResponse.body.data?.id;
  console.log('✅ Created feedback ID:', feedbackId);
  
  // Check CREATE response
  const createContent = createResponse.body.data?.content;
  console.log('\n📋 CREATE Response content fields:', Object.keys(createContent || {}));
  console.log('   whatDoYouNeedFromMe in response:', createContent?.whatDoYouNeedFromMe ? '✅ PRESENT' : '❌ MISSING');
  console.log('   bottomLine in response:', createContent?.bottomLine ? '✅ PRESENT' : '❌ MISSING');
  
  if (createContent?.whatDoYouNeedFromMe !== testWhatDoYouNeedFromMe) {
    console.error('\n❌ BUG FOUND IN CREATE RESPONSE!');
    console.log('   Expected:', testWhatDoYouNeedFromMe);
    console.log('   Got:', createContent?.whatDoYouNeedFromMe);
  } else {
    console.log('   ✅ CREATE response has correct whatDoYouNeedFromMe');
  }
  
  // Step 3: GET the feedback to verify persistence
  console.log('\nStep 3: Fetching feedback to verify persistence...');
  const getResponse = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/feedback/${feedbackId}`,
    method: 'GET',
    headers: { 
      'Cookie': `${authToken}; csrf-token=${csrfToken}`
    }
  });
  
  console.log('GET status:', getResponse.status);
  
  if (getResponse.status !== 200) {
    console.error('❌ Failed to fetch feedback');
    console.log('Response:', JSON.stringify(getResponse.body, null, 2));
    process.exit(1);
  }
  
  const getContent = getResponse.body.data?.content;
  console.log('\n📋 GET Response content fields:', Object.keys(getContent || {}));
  console.log('   whatDoYouNeedFromMe in response:', getContent?.whatDoYouNeedFromMe ? '✅ PRESENT' : '❌ MISSING');
  console.log('   bottomLine in response:', getContent?.bottomLine ? '✅ PRESENT' : '❌ MISSING');
  
  if (getContent?.whatDoYouNeedFromMe !== testWhatDoYouNeedFromMe) {
    console.error('\n❌ BUG FOUND IN GET RESPONSE!');
    console.log('   Expected:', testWhatDoYouNeedFromMe);
    console.log('   Got:', getContent?.whatDoYouNeedFromMe);
  } else {
    console.log('   ✅ GET response has correct whatDoYouNeedFromMe');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BUG TEST SUMMARY');
  console.log('='.repeat(60));
  
  const createHasField = createContent?.whatDoYouNeedFromMe === testWhatDoYouNeedFromMe;
  const getHasField = getContent?.whatDoYouNeedFromMe === testWhatDoYouNeedFromMe;
  
  console.log(`CREATE response: ${createHasField ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`GET response:    ${getHasField ? '✅ PASS' : '❌ FAIL'}`);
  
  if (createHasField && getHasField) {
    console.log('\n✅ SUCCESS - whatDoYouNeedFromMe is being saved correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ BUG CONFIRMED - whatDoYouNeedFromMe is NOT being saved correctly!');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
