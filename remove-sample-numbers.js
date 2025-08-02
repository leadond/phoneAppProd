// Script to remove invalid sample phone numbers that start with 0
// Real phone numbers don't start with 0, so these are clearly test/sample data

import { browserDatabase } from './src/lib/browserDatabase.js';

async function removeSampleNumbers() {
  try {
    console.log('🔍 Starting cleanup of sample phone numbers...');
    
    // Initialize database
    await browserDatabase.ensureInitialized();
    
    // Get all phone numbers
    console.log('📊 Fetching all phone numbers from database...');
    const allNumbers = await browserDatabase.getAllPhoneNumbers();
    console.log(`Found ${allNumbers.length} total phone numbers in database`);
    
    // Filter numbers that start with 0 (invalid sample data)
    const sampleNumbers = allNumbers.filter(phone => {
      const number = phone.number || phone.phoneNumber || '';
      // Remove any formatting and check if it starts with 0
      const cleanNumber = number.replace(/[^0-9]/g, '');
      return cleanNumber.length === 10 && cleanNumber.startsWith('0');
    });
    
    console.log(`🎯 Found ${sampleNumbers.length} sample numbers starting with 0:`);
    sampleNumbers.forEach((phone, index) => {
      const number = phone.number || phone.phoneNumber || '';
      console.log(`  ${index + 1}. ${number} (ID: ${phone.id})`);
    });
    
    if (sampleNumbers.length === 0) {
      console.log('✅ No sample numbers starting with 0 found. Database is clean!');
      return;
    }
    
    // Remove each sample number
    console.log('🗑️ Removing sample numbers...');
    let removed = 0;
    let failed = 0;
    
    for (const phone of sampleNumbers) {
      try {
        const success = await browserDatabase.deletePhoneNumber(phone.id);
        if (success) {
          removed++;
          console.log(`✅ Removed: ${phone.number || phone.phoneNumber}`);
        } else {
          failed++;
          console.log(`❌ Failed to remove: ${phone.number || phone.phoneNumber}`);
        }
      } catch (error) {
        failed++;
        console.log(`❌ Error removing ${phone.number || phone.phoneNumber}:`, error.message);
      }
    }
    
    // Add audit log entry
    await browserDatabase.insertAuditEntry({
      action: `Removed ${removed} sample phone numbers starting with 0`,
      user: 'system',
      type: 'cleanup',
      details: { removed, failed, total: sampleNumbers.length }
    });
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const remainingNumbers = await browserDatabase.getAllPhoneNumbers();
    const stillHasSamples = remainingNumbers.filter(phone => {
      const number = phone.number || phone.phoneNumber || '';
      const cleanNumber = number.replace(/[^0-9]/g, '');
      return cleanNumber.length === 10 && cleanNumber.startsWith('0');
    });
    
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log(`✅ Successfully removed: ${removed} sample numbers`);
    console.log(`❌ Failed to remove: ${failed} sample numbers`);
    console.log(`📱 Total numbers remaining: ${remainingNumbers.length}`);
    console.log(`🚫 Sample numbers still remaining: ${stillHasSamples.length}`);
    
    if (stillHasSamples.length > 0) {
      console.log('\n⚠️ WARNING: Some sample numbers starting with 0 still remain:');
      stillHasSamples.forEach(phone => {
        console.log(`  - ${phone.number || phone.phoneNumber} (ID: ${phone.id})`);
      });
    } else {
      console.log('\n🎉 SUCCESS: All sample numbers starting with 0 have been removed!');
    }
    
  } catch (error) {
    console.error('💥 Error during cleanup:', error);
    throw error;
  } finally {
    // Close database connection
    browserDatabase.close();
  }
}

// Run the cleanup
removeSampleNumbers()
  .then(() => {
    console.log('\n✨ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });