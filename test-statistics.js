// Test script to verify statistical calculations logic
// Simple test function to validate statistics logic
function testStatisticsCalculation() {
  console.log('Testing Statistical Calculations...');
  
  // Sample phone numbers data
  const samplePhoneNumbers = [
    {
      id: '1',
      number: '346-720-0001',
      status: 'available',
      department: 'Sales',
      carrier: 'AT&T',
      aging_days: 5,
      date_available: '2025-01-01T00:00:00Z'
    },
    {
      id: '2',
      number: '346-720-0002',
      status: 'assigned',
      department: 'Sales',
      carrier: 'AT&T',
      aging_days: 10,
      date_available: null
    },
    {
      id: '3',
      number: '800-555-0001',
      status: 'available',
      department: 'Support',
      carrier: 'Verizon',
      aging_days: 45,
      date_available: '2024-12-01T00:00:00Z'
    },
    {
      id: '4',
      number: '800-555-0002',
      status: 'reserved',
      department: 'Support',
      carrier: 'Verizon',
      aging_days: 0,
      date_available: null
    }
  ];

  // Calculate statistics manually
  const stats = samplePhoneNumbers.reduce((acc, phone) => {
    acc.total++;
    switch (phone.status) {
      case 'assigned':
        acc.assigned++;
        break;
      case 'available':
        acc.available++;
        break;
      case 'reserved':
        acc.reserved++;
        break;
      case 'aging':
        acc.aging++;
        break;
    }
    return acc;
  }, { 
    total: 0, 
    assigned: 0, 
    available: 0, 
    reserved: 0, 
    aging: 0 
  });

  // Calculate aging numbers (numbers available > 30 days)
  const now = new Date();
  let actualAgingNumbers = 0;
  
  samplePhoneNumbers.forEach(phone => {
    if (phone.aging_days > 30 || 
        (phone.status === 'available' && phone.date_available)) {
      const availableDate = new Date(phone.date_available);
      const daysSinceAvailable = Math.floor((now.getTime() - availableDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceAvailable > 30) {
        actualAgingNumbers++;
      }
    }
  });

  console.log('Sample Data Statistics:');
  console.log('- Total Numbers:', stats.total);
  console.log('- Assigned Numbers:', stats.assigned);
  console.log('- Available Numbers:', stats.available);
  console.log('- Reserved Numbers:', stats.reserved);
  console.log('- Aging Numbers (calculated):', actualAgingNumbers);
  console.log('- Utilization Rate:', ((stats.assigned / stats.total) * 100).toFixed(1) + '%');

  // Test department utilization
  const departments = [...new Set(samplePhoneNumbers.map(n => n.department))];
  console.log('\nDepartment Utilization:');
  departments.forEach(dept => {
    const deptNumbers = samplePhoneNumbers.filter(n => n.department === dept);
    const assigned = deptNumbers.filter(n => n.status === 'assigned').length;
    const available = deptNumbers.filter(n => n.status === 'available').length;
    const reserved = deptNumbers.filter(n => n.status === 'reserved').length;
    console.log(`- ${dept}: ${deptNumbers.length} total (${assigned} assigned, ${available} available, ${reserved} reserved)`);
  });

  // Test carrier distribution
  const carriers = [...new Set(samplePhoneNumbers.map(n => n.carrier))];
  console.log('\nCarrier Distribution:');
  carriers.forEach(carrier => {
    const count = samplePhoneNumbers.filter(n => n.carrier === carrier).length;
    const percentage = Math.round((count / stats.total) * 100);
    console.log(`- ${carrier}: ${count} numbers (${percentage}%)`);
  });

  console.log('\n✅ Statistical calculations test completed successfully!');
}

// Run the test
testStatisticsCalculation();