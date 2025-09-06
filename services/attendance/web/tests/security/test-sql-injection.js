#!/usr/bin/env node

/**
 * SQL Injection Security Test Runner
 * Tests the SQL injection prevention system with real attack vectors
 */

const { SQLInjectionDetector, InputValidator, QuerySanitizer, WhitelistValidator } = require('../../lib/security/sql-injection-prevention');

console.log('🔐 SQL Injection Security Test Runner');
console.log('=====================================\n');

// Test attack vectors
const attackVectors = [
  // Classic SQL Injection
  "admin'; DROP TABLE users; --",
  "' OR '1'='1",
  "1' UNION SELECT * FROM passwords --",
  
  // Time-based blind SQL injection
  "admin' AND SLEEP(5) --",
  "1' AND (SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END) --",
  
  // Boolean-based blind SQL injection
  "admin' AND 1=1 --",
  "admin' AND 1=2 --",
  
  // Stacked queries
  "1'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'ADMIN'); --",
  
  // Encoded attacks
  "0x27204F52202731273D2731",
  "CHAR(39)+CHAR(32)+CHAR(79)+CHAR(82)",
  
  // Comment evasion
  "ad/*comment*/min' OR 1=1 --",
  "UN/**/ION SEL/**/ECT * FROM users"
];

// Legitimate inputs that should pass
const legitimateInputs = [
  "john.doe@example.com",
  "John O'Brien",
  "Search for user's data",
  "123-456-7890",
  "Employee-123"
];

// Initialize components
const detector = new SQLInjectionDetector();
const validator = new InputValidator();
const sanitizer = new QuerySanitizer();
const whitelist = new WhitelistValidator();

console.log('🎯 Testing SQL Injection Detection');
console.log('-----------------------------------');

let detectedCount = 0;
let missedCount = 0;

// Test malicious inputs
console.log('\n⚠️  Testing Attack Vectors:');
attackVectors.forEach((input, index) => {
  const result = detector.detect(input);
  const status = result.isMalicious ? '✅ BLOCKED' : '❌ MISSED';
  
  if (result.isMalicious) {
    detectedCount++;
  } else {
    missedCount++;
  }
  
  console.log(`  ${index + 1}. ${status} - "${input.substring(0, 50)}..." 
     Confidence: ${(result.confidence * 100).toFixed(1)}%
     Types: ${result.attackType.join(', ') || 'None'}`);
});

console.log(`\n📊 Detection Rate: ${detectedCount}/${attackVectors.length} (${((detectedCount/attackVectors.length) * 100).toFixed(1)}%)`);

// Test legitimate inputs
console.log('\n✅ Testing Legitimate Inputs:');
let falsePositives = 0;

legitimateInputs.forEach((input, index) => {
  const result = detector.detect(input);
  const status = !result.isMalicious ? '✅ ALLOWED' : '❌ FALSE POSITIVE';
  
  if (result.isMalicious) {
    falsePositives++;
  }
  
  console.log(`  ${index + 1}. ${status} - "${input}"`);
});

console.log(`\n📊 False Positive Rate: ${falsePositives}/${legitimateInputs.length} (${((falsePositives/legitimateInputs.length) * 100).toFixed(1)}%)`);

// Test Input Validation
console.log('\n🔍 Testing Input Validation');
console.log('---------------------------');

const testEmails = [
  "valid@example.com",
  "admin'@example.com",
  "test@test.com' OR '1'='1"
];

console.log('\nEmail Validation:');
testEmails.forEach(email => {
  const result = validator.validateEmail(email);
  console.log(`  "${email}": ${result.isValid ? '✅ Valid' : '❌ Invalid'} ${result.errors.join(', ')}`);
});

// Test Query Sanitization
console.log('\n🧹 Testing Query Sanitization');
console.log('-----------------------------');

const testQueries = [
  "O'Brien's Company",
  "test'; DROP TABLE users; --",
  "value -- comment"
];

console.log('\nString Escaping:');
testQueries.forEach(query => {
  const sanitized = sanitizer.escapeString(query);
  console.log(`  Original: "${query}"`);
  console.log(`  Sanitized: "${sanitized}"\n`);
});

// Test Whitelist Validation
console.log('📋 Testing Whitelist Validation');
console.log('-------------------------------');

const testRoles = [
  "ADMIN",
  "SUPER_ADMIN",
  "ADMIN'; DROP TABLE users; --"
];

console.log('\nRole Validation:');
testRoles.forEach(role => {
  const isValid = whitelist.validate('roles', role);
  console.log(`  "${role}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

// Performance Test
console.log('\n⚡ Performance Test');
console.log('-------------------');

const iterations = 10000;
const perfStart = Date.now();

for (let i = 0; i < iterations; i++) {
  detector.detect(attackVectors[i % attackVectors.length]);
}

const perfEnd = Date.now();
const avgTime = (perfEnd - perfStart) / iterations;

console.log(`  Processed ${iterations} detections in ${perfEnd - perfStart}ms`);
console.log(`  Average time per detection: ${avgTime.toFixed(3)}ms`);

// Summary
console.log('\n🏁 Test Summary');
console.log('===============');
console.log(`✅ Detection Success Rate: ${((detectedCount/attackVectors.length) * 100).toFixed(1)}%`);
console.log(`✅ False Positive Rate: ${((falsePositives/legitimateInputs.length) * 100).toFixed(1)}%`);
console.log(`✅ Performance: ${avgTime.toFixed(3)}ms per check`);

if (missedCount > 0) {
  console.log(`\n⚠️  Warning: ${missedCount} attack vectors were not detected!`);
  process.exit(1);
}

if (falsePositives > 0) {
  console.log(`\n⚠️  Warning: ${falsePositives} false positives detected!`);
  process.exit(1);
}

console.log('\n✅ All security tests passed successfully!');
process.exit(0);