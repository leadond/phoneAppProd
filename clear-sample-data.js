// Clear sample data and ensure user's uploaded data is displayed
const clearSampleData = async () => {
  try {
    // Open the IndexedDB database
    const request = indexedDB.open('PhoneRangeNexus', 2);
    
    request.onsuccess = async (event) => {
      const db = event.target.result;
      
      console.log('Connected to database');
      
      // Check current phone numbers count
      const phoneStore = db.transaction(['phone_numbers'], 'readonly').objectStore('phone_numbers');
      const countRequest = phoneStore.count();
      
      countRequest.onsuccess = () => {
        console.log(`Total phone numbers in database: ${countRequest.result}`);
        
        // Get a sample of the data to see what's there
        const getAllRequest = phoneStore.getAll();
        getAllRequest.onsuccess = () => {
          const allNumbers = getAllRequest.result;
          
          console.log('First 10 phone numbers:');
          allNumbers.slice(0, 10).forEach((phone, index) => {
            console.log(`${index + 1}. ${phone.number} - ${phone.status} - ${phone.carrier || 'Unknown'}`);
          });
          
          // Check if we have sample data mixed with real data
          const sampleNumbers = allNumbers.filter(phone => 
            phone.number === '346-720-0001' || 
            phone.number === '346-720-0002' || 
            phone.number === '800-555-0001'
          );
          
          if (sampleNumbers.length > 0) {
            console.log(`Found ${sampleNumbers.length} sample numbers that need to be removed`);
            
            // Remove sample data
            const transaction = db.transaction(['phone_numbers'], 'readwrite');
            const store = transaction.objectStore('phone_numbers');
            
            sampleNumbers.forEach(samplePhone => {
              store.delete(samplePhone.id);
              console.log(`Removing sample number: ${samplePhone.number}`);
            });
            
            transaction.oncomplete = () => {
              console.log('Sample data removed successfully');
              // Clear the seeding flag to prevent re-seeding
              localStorage.removeItem('phoneRangeNexus_dataSeedingCompleted');
              console.log('Database cleanup completed. Please refresh the page.');
            };
          } else {
            console.log('No sample data found - your uploaded data should be displaying correctly');
          }
        };
      };
      
      db.close();
    };
    
    request.onerror = (event) => {
      console.error('Failed to open database:', event.target.error);
    };
    
  } catch (error) {
    console.error('Error clearing sample data:', error);
  }
};

// Run the cleanup
clearSampleData();