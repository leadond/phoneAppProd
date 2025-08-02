// Script to check IndexedDB contents (to be run in browser console)
console.log('Checking IndexedDB database...');

function checkDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('phoneNumbersDB', 1);
    
    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      console.log('Database opened successfully');
      console.log('Database version:', db.version);
      console.log('Object stores:', Array.from(db.objectStoreNames));
      
      if (db.objectStoreNames.contains('phoneNumbers')) {
        const transaction = db.transaction(['phoneNumbers'], 'readonly');
        const store = transaction.objectStore('phoneNumbers');
        
        // Count all records
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          console.log('Total phone numbers in database:', countRequest.result);
          
          // Get first 10 records to inspect
          const getAllRequest = store.getAll(undefined, 10);
          getAllRequest.onsuccess = () => {
            console.log('First 10 records:');
            getAllRequest.result.forEach((record, index) => {
              console.log(`${index + 1}:`, {
                id: record.id,
                phoneNumber: record.phoneNumber,
                status: record.status,
                assignedTo: record.assignedTo,
                createdAt: record.createdAt
              });
            });
            resolve(countRequest.result);
          };
        };
      } else {
        console.log('phoneNumbers object store not found');
        resolve(0);
      }
      
      db.close();
    };
  });
}

checkDatabase().then(count => {
  console.log(`Database check complete. Total records: ${count}`);
}).catch(error => {
  console.error('Database check failed:', error);
});