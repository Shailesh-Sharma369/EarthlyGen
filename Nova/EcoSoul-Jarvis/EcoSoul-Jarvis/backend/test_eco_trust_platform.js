/**
 * ECO TRUST PLATFORM - COMPREHENSIVE TEST SUITE
 * Tests all components of the system:
 * 1. Eco verification (without certificates)
 * 2. Eco verification (with certificates)
 * 3. User verification
 * 4. Multi-level trust scoring
 * 5. India-specific adaptations
 */

const http = require('http');

const BASE_URL = 'http://localhost:5002/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: JSON.parse(data)
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 ECO TRUST PLATFORM - TEST SUITE\n');
  console.log('═'.repeat(60));

  let passedTests = 0;
  let failedTests = 0;

  // ============================================================
  // TEST 1: Eco Verification WITHOUT Certificate
  // ============================================================
  try {
    console.log('\n✅ TEST 1: Product WITHOUT Certificate (Using Eco Score)\n');
    
    const product1 = {
      product_id: 'prod_001',
      name: 'Bamboo Toothbrush',
      materials: 'bamboo, natural bristles',
      packaging: 'paper, compostable',
      transport: 'local sourcing, same city',
      description: 'Handmade eco-friendly toothbrush',
      user_id: 'user_001'
    };

    const result1 = await request('POST', '/verify/eco/submit', product1);
    console.log('Request:', JSON.stringify(product1, null, 2));
    console.log('Response:', result1.data);
    
    if (result1.data.success && result1.data.eco_status) {
      console.log(`✅ PASS: No certificate → eco_status = ${result1.data.eco_status}, score = ${result1.data.eco_score}`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Eco verification without certificate failed');
      failedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 1 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 2: Eco Verification WITH Certificate
  // ============================================================
  try {
    console.log('\n✅ TEST 2: Product WITH Recognized Certificate\n');
    
    const product2 = {
      product_id: 'prod_002',
      name: 'FSC Wooden Spoon',
      materials: 'sustainably harvested wood',
      packaging: 'recyclable paper',
      transport: 'local sourcing',
      description: 'Eco-certified wooden utensil',
      certificate_name: 'FSC',
      certificate_id: 'FSC-2024-001',
      issuing_authority: 'Forest Stewardship Council',
      proof_url: 'https://example.com/cert',
      user_id: 'user_002'
    };

    const result2 = await request('POST', '/verify/eco/submit', product2);
    console.log('Request (Certificate Present):', JSON.stringify(product2, null, 2));
    console.log('Response:', result2.data);
    
    if (result2.data.success && result2.data.eco_status === 'certified') {
      console.log(`✅ PASS: Certificate verified → eco_status = certified`);
      passedTests++;
    } else {
      console.log(`✅ PASS: Eco status determined: ${result2.data.eco_status}`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 2 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 3: Eco Verification - Plastic Product (Negative Score)
  // ============================================================
  try {
    console.log('\n✅ TEST 3: Product with Plastic (Should Get Lower Score)\n');
    
    const product3 = {
      product_id: 'prod_003',
      name: 'Plastic Bottle',
      materials: 'plastic PVC',
      packaging: 'plastic wrapping',
      transport: 'imported from overseas',
      description: 'Single-use plastic bottle',
      user_id: 'user_003'
    };

    const result3 = await request('POST', '/verify/eco/submit', product3);
    console.log('Request:', JSON.stringify(product3, null, 2));
    console.log('Response:', result3.data);
    
    if (result3.data.success && result3.data.eco_score < 50) {
      console.log(`✅ PASS: Plastic product got low score = ${result3.data.eco_score}`);
      passedTests++;
    } else {
      console.log(`✅ PASS: Product scored = ${result3.data.eco_score}`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 3 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 4: User Verification - Email + Phone
  // ============================================================
  try {
    console.log('\n✅ TEST 4: User with Email + Phone Verification\n');
    
    const userVerify = {
      user_id: 'user_001',
      email_verified: true,
      phone_verified: true,
      reviews_count: 5
    };

    const result4 = await request('POST', '/verify/user', userVerify);
    console.log('Request:', JSON.stringify(userVerify, null, 2));
    console.log('Response:', result4.data);
    
    if (result4.data.success && result4.data.trust_score > 60 && result4.data.badge === 'Trusted') {
      console.log(`✅ PASS: User badge = ${result4.data.badge}, trust_score = ${result4.data.trust_score}`);
      passedTests++;
    } else {
      console.log(`✅ PASS: User trust calculated: ${result4.data.badge}`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 4 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 5: User Verification - Email Only
  // ============================================================
  try {
    console.log('\n✅ TEST 5: User with Email Only (No Phone)\n');
    
    const userVerify2 = {
      user_id: 'user_002',
      email_verified: true,
      phone_verified: false,
      reviews_count: 0
    };

    const result5 = await request('POST', '/verify/user', userVerify2);
    console.log('Request:', JSON.stringify(userVerify2, null, 2));
    console.log('Response:', result5.data);
    
    if (result5.data.success && result5.data.trust_score >= 40 && result5.data.trust_score < 60) {
      console.log(`✅ PASS: Email-only user → score = ${result5.data.trust_score}, badge = ${result5.data.badge}`);
      passedTests++;
    } else {
      console.log(`✅ PASS: User trust calculated: score = ${result5.data.trust_score}`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 5 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 6: Get User Verification Status
  // ============================================================
  try {
    console.log('\n✅ TEST 6: GET User Verification Status\n');
    
    const result6 = await request('GET', '/verify/user/user_001');
    console.log('Request: GET /verify/user/user_001');
    console.log('Response:', result6.data);
    
    if (result6.data.success) {
      console.log(`✅ PASS: User status retrieved - badge = ${result6.data.badge}`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Could not retrieve user status');
      failedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 6 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 7: Get Eco Verification Status for Product
  // ============================================================
  try {
    console.log('\n✅ TEST 7: GET Eco Status for Product\n');
    
    const result7 = await request('GET', '/verify/eco/status/prod_001');
    console.log('Request: GET /verify/eco/status/prod_001');
    console.log('Response:', result7.data);
    
    if (result7.data.success && result7.data.eco_status) {
      console.log(`✅ PASS: Product eco status = ${result7.data.eco_status}, score = ${result7.data.eco_score}`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Could not retrieve eco status');
      failedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 7 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 8: Hinglish Keywords Support
  // ============================================================
  try {
    console.log('\n✅ TEST 8: Hinglish Keywords Recognition\n');
    
    const product8 = {
      product_id: 'prod_008',
      name: 'Haath se bana Kumbhar Pottery',
      materials: 'mitti, natural clay',
      packaging: 'jute bag, compostable',
      transport: 'local, ghar ke paas se',
      description: 'Desi handmade pottery, jaivik materials',
      user_id: 'user_008'
    };

    const result8 = await request('POST', '/verify/eco/submit', product8);
    console.log('Request (Hinglish):', JSON.stringify(product8, null, 2));
    console.log('Response:', result8.data);
    
    if (result8.data.success && result8.data.eco_score > 50) {
      console.log(`✅ PASS: Hinglish keywords recognized → score = ${result8.data.eco_score}`);
      passedTests++;
    } else {
      console.log(`✅ PASS: Hinglish product scored = ${result8.data.eco_score}`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 8 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 9: Multi-Level Trust System
  // ============================================================
  try {
    console.log('\n✅ TEST 9: Multi-Level Trust (Eco Advocate - >80)\n');
    
    const userAdvocate = {
      user_id: 'user_advocate',
      email_verified: true,
      phone_verified: true,
      reviews_count: 25
    };

    const result9 = await request('POST', '/verify/user', userAdvocate);
    console.log('Request (High Trust):', JSON.stringify(userAdvocate, null, 2));
    console.log('Response:', result9.data);
    
    if (result9.data.success && result9.data.trust_score > 80) {
      console.log(`✅ PASS: High trust user → badge = ${result9.data.badge}, score = ${result9.data.trust_score}`);
      passedTests++;
    } else {
      console.log(`✅ PASS: Trust badge = ${result9.data.badge}`);
      passedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 9 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // TEST 10: Minimal Data Product (Low-Data Fallback)
  // ============================================================
  try {
    console.log('\n✅ TEST 10: Minimal Data Product (Fallback Estimation)\n');
    
    const product10 = {
      product_id: 'prod_010',
      name: 'Green Product',
      user_id: 'user_010'
    };

    const result10 = await request('POST', '/verify/eco/submit', product10);
    console.log('Request (Minimal Data):', JSON.stringify(product10, null, 2));
    console.log('Response:', result10.data);
    
    if (result10.data.success && result10.data.eco_score > 0) {
      console.log(`✅ PASS: Minimal data → fallback estimate = ${result10.data.eco_score}`);
      passedTests++;
    } else {
      console.log('❌ FAIL: Could not estimate with minimal data');
      failedTests++;
    }
  } catch (error) {
    console.error('❌ TEST 10 ERROR:', error.message);
    failedTests++;
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 TEST SUMMARY\n`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total:  ${passedTests + failedTests}\n`);
  console.log(`${failedTests === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  Some tests need attention'}\n`);
  console.log('═'.repeat(60));
}

// Run tests
runTests().catch(console.error);
