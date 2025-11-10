#!/usr/bin/env node
/**
 * Quick validation test for Zconfig.json
 * Tests that incomplete optional modules don't cause errors
 */

const { loadConfig } = require('./packages/shared/dist/config/index.js');

console.log('========================================');
console.log('Testing Zconfig.json Validation');
console.log('========================================\n');

try {
  const config = loadConfig({
    configPath: './config/Zconfig.json',
    throwOnError: true,
    logErrors: true,
  });
  
  console.log('✅ SUCCESS: Configuration loaded successfully!\n');
  console.log('LPARs configured:', Object.keys(config.dds).join(', '));
  console.log('\nConfiguration details:');
  
  for (const [lpar, lparConfig] of Object.entries(config.dds)) {
    console.log(`\n  ${lpar}:`);
    console.log(`    - DDS URL: ${lparConfig.ddsbaseurl}:${lparConfig.ddsbaseport}`);
    console.log(`    - Auth: ${lparConfig.ddsauth}`);
    console.log(`    - HMAI configured: ${lparConfig.hmai ? 'Yes' : 'No'}`);
    console.log(`    - HMRE configured: ${lparConfig.hmre ? 'Yes (lenient)' : 'No'}`);
    console.log(`    - DCOL configured: ${lparConfig.dcol ? 'Yes (lenient)' : 'No'}`);
    console.log(`    - RMFMon1 configured: ${lparConfig.rmfmon1 ? 'Yes (lenient)' : 'No'}`);
  }
  
  console.log('\n========================================');
  console.log('Validation Test PASSED ✅');
  console.log('========================================\n');
  process.exit(0);
  
} catch (error) {
  console.error('❌ FAILED: Configuration validation error!\n');
  console.error(error.message);
  
  if (error.issues) {
    console.error('\nValidation errors:');
    for (const issue of error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
  }
  
  console.log('\n========================================');
  console.log('Validation Test FAILED ❌');
  console.log('========================================\n');
  process.exit(1);
}


