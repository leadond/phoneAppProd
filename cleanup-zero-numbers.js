// Browser script to clean up numbers starting with zero
// Run this in the browser console on the application page

async function cleanupZeroNumbers() {
  console.log('🧹 Starting cleanup of numbers that start with 0...');
  
  try {
    // Open IndexedDB
    const dbName = 'phoneRangeNexus';
    const request = indexedDB.open(dbName, 1);
    
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    console.log('📂 Database opened successfully');
    
    // Get all phone numbers
    const transaction = db.transaction(['phoneNumbers'], 'readwrite');
    const store = transaction.objectStore('phoneNumbers');
    
    const getAllRequest = store.getAll();
    const allNumbers = await new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
    
    console.log(`📊 Found ${allNumbers.length} total phone numbers`);
    
    // Filter numbers that start with 0
    const zeroNumbers = allNumbers.filter(phone => {
      const cleanNumber = phone.number.replace(/[^0-9]/g, '');
      return cleanNumber.startsWith('0');
    });
    
    console.log(`🎯 Found ${zeroNumbers.length} numbers starting with 0:`);
    zeroNumbers.forEach(phone => console.log(`  📞 ${phone.number} (Extension: ${phone.extension})`));
    
    if (zeroNumbers.length === 0) {
      console.log('✅ No numbers starting with 0 found. Database is clean!');
      db.close();
      return;
    }
    
    // Delete each number that starts with 0
    let deleted = 0;
    for (const phone of zeroNumbers) {
      const deleteRequest = store.delete(phone.id);
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
      deleted++;
      console.log(`🗑️  Deleted: ${phone.number}`);
    }
    
    // Wait for transaction to complete
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    
    console.log(`✅ Cleanup complete! Successfully removed ${deleted} numbers starting with 0.`);
    
    // Also clear any localStorage that might contain zero-prefixed numbers
    const localStorageKeys = Object.keys(localStorage);
    const phoneKeys = localStorageKeys.filter(key => 
      key.includes('phone') && localStorage.getItem(key)?.includes('"0')
    );
    
    if (phoneKeys.length > 0) {
      console.log(`🧹 Cleaning ${phoneKeys.length} localStorage entries...`);
      phoneKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️  Cleared localStorage: ${key}`);
      });
    }
    
    // Also clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    const sessionPhoneKeys = sessionStorageKeys.filter(key => 
      key.includes('phone') && sessionStorage.getItem(key)?.includes('"0')
    );
    
    if (sessionPhoneKeys.length > 0) {
      console.log(`🧹 Cleaning ${sessionPhoneKeys.length} sessionStorage entries...`);
      sessionPhoneKeys.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️  Cleared sessionStorage: ${key}`);
      });
    }
    
    db.close();
    console.log('🎉 All cleanup operations completed successfully!');
    console.log('💡 Refresh the page to see the clean data.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupZeroNumbers();