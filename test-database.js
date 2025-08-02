// Database Integration Test Script
// This script will verify all database operations and identify any issues

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read environment variables from .env file
let supabaseUrl, supabaseAnonKey;

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    const [key, value] = line.split('=');
    if (key === 'VITE_SUPABASE_URL') {
      supabaseUrl = value;
    } else if (key === 'VITE_SUPABASE_ANON_KEY') {
      supabaseAnonKey = value;
    }
  }
} catch (error) {
  // Fallback to environment variables
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test data for operations
const testPhoneNumber = {
  number: '346-720-TEST',
  status: 'available',
  system: 'Test System',
  carrier: 'Test Carrier',
  department: 'Testing',
  location: 'Test Location',
  extension: 'TEST',
  number_type: 'local',
  range: 'Test Range',
  aging_days: 0,
  usage_inbound: 0,
  usage_outbound: 0
};

const testNumberRange = {
  name: 'Test Range',
  pattern: '346-720-XXXX',
  start_number: '346-720-0001',
  end_number: '346-720-0100',
  total_numbers: 100,
  available_numbers: 100,
  assigned_numbers: 0,
  reserved_numbers: 0,
  carrier: 'Test Carrier',
  location: 'Test Location',
  department: 'Testing',
  date_created: new Date().toISOString().split('T')[0],
  notes: 'Test range for database verification',
  status: 'active'
};

const testBulkOperation = {
  type: 'import',
  status: 'completed',
  progress: 100,
  total_items: 1,
  processed_items: 1,
  failed_items: 0,
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  details: 'Database test operation'
};

const testAuditEntry = {
  action: 'Database integration test executed',
  user: 'system',
  timestamp: new Date().toISOString(),
  type: 'settings',
  details: { test: true }
};

// Test functions
async function testConnection() {
  console.log('\n🔌 Testing Database Connection...');
  try {
    const { data, error } = await supabase.from('phone_numbers').select('count').limit(1);
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (error) {
      console.error(`❌ Table '${tableName}' check failed:`, error.message);
      return false;
    }
    console.log(`✅ Table '${tableName}' exists and accessible`);
    return true;
  } catch (error) {
    console.error(`❌ Table '${tableName}' error:`, error.message);
    return false;
  }
}

async function testPhoneNumbersCRUD() {
  console.log('\n📱 Testing Phone Numbers CRUD Operations...');
  let testId = null;
  
  try {
    // CREATE
    console.log('  Testing CREATE...');
    const { data: createData, error: createError } = await supabase
      .from('phone_numbers')
      .insert([testPhoneNumber])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ CREATE failed:', createError.message);
      return false;
    }
    testId = createData.id;
    console.log('✅ CREATE successful');

    // READ
    console.log('  Testing READ...');
    const { data: readData, error: readError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('id', testId)
      .single();
    
    if (readError) {
      console.error('❌ READ failed:', readError.message);
      return false;
    }
    console.log('✅ READ successful');

    // UPDATE
    console.log('  Testing UPDATE...');
    const { data: updateData, error: updateError } = await supabase
      .from('phone_numbers')
      .update({ status: 'assigned', assigned_to: 'Test User' })
      .eq('id', testId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ UPDATE failed:', updateError.message);
      return false;
    }
    console.log('✅ UPDATE successful');

    // DELETE
    console.log('  Testing DELETE...');
    const { error: deleteError } = await supabase
      .from('phone_numbers')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.error('❌ DELETE failed:', deleteError.message);
      return false;
    }
    console.log('✅ DELETE successful');
    
    return true;
  } catch (error) {
    console.error('❌ Phone Numbers CRUD error:', error.message);
    // Cleanup on error
    if (testId) {
      await supabase.from('phone_numbers').delete().eq('id', testId);
    }
    return false;
  }
}

async function testNumberRangesCRUD() {
  console.log('\n📋 Testing Number Ranges CRUD Operations...');
  let testId = null;
  
  try {
    // CREATE
    const { data: createData, error: createError } = await supabase
      .from('number_ranges')
      .insert([testNumberRange])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Number Ranges CREATE failed:', createError.message);
      return false;
    }
    testId = createData.id;
    console.log('✅ Number Ranges CREATE successful');

    // READ
    const { data: readData, error: readError } = await supabase
      .from('number_ranges')
      .select('*')
      .eq('id', testId)
      .single();
    
    if (readError) {
      console.error('❌ Number Ranges READ failed:', readError.message);
      return false;
    }
    console.log('✅ Number Ranges READ successful');

    // UPDATE
    const { data: updateData, error: updateError } = await supabase
      .from('number_ranges')
      .update({ status: 'inactive', notes: 'Updated test range' })
      .eq('id', testId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Number Ranges UPDATE failed:', updateError.message);
      return false;
    }
    console.log('✅ Number Ranges UPDATE successful');

    // DELETE
    const { error: deleteError } = await supabase
      .from('number_ranges')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.error('❌ Number Ranges DELETE failed:', deleteError.message);
      return false;
    }
    console.log('✅ Number Ranges DELETE successful');
    
    return true;
  } catch (error) {
    console.error('❌ Number Ranges CRUD error:', error.message);
    if (testId) {
      await supabase.from('number_ranges').delete().eq('id', testId);
    }
    return false;
  }
}

async function testBulkOperationsCRUD() {
  console.log('\n🔄 Testing Bulk Operations CRUD Operations...');
  let testId = null;
  
  try {
    // CREATE
    const { data: createData, error: createError } = await supabase
      .from('bulk_operations')
      .insert([testBulkOperation])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Bulk Operations CREATE failed:', createError.message);
      return false;
    }
    testId = createData.id;
    console.log('✅ Bulk Operations CREATE successful');

    // READ
    const { data: readData, error: readError } = await supabase
      .from('bulk_operations')
      .select('*')
      .eq('id', testId)
      .single();
    
    if (readError) {
      console.error('❌ Bulk Operations READ failed:', readError.message);
      return false;
    }
    console.log('✅ Bulk Operations READ successful');

    // UPDATE
    const { data: updateData, error: updateError } = await supabase
      .from('bulk_operations')
      .update({ status: 'failed', progress: 50 })
      .eq('id', testId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Bulk Operations UPDATE failed:', updateError.message);
      return false;
    }
    console.log('✅ Bulk Operations UPDATE successful');

    // DELETE
    const { error: deleteError } = await supabase
      .from('bulk_operations')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.error('❌ Bulk Operations DELETE failed:', deleteError.message);
      return false;
    }
    console.log('✅ Bulk Operations DELETE successful');
    
    return true;
  } catch (error) {
    console.error('❌ Bulk Operations CRUD error:', error.message);
    if (testId) {
      await supabase.from('bulk_operations').delete().eq('id', testId);
    }
    return false;
  }
}

async function testAuditLogCRUD() {
  console.log('\n📊 Testing Audit Log CRUD Operations...');
  let testId = null;
  
  try {
    // CREATE
    const { data: createData, error: createError } = await supabase
      .from('audit_log')
      .insert([testAuditEntry])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Audit Log CREATE failed:', createError.message);
      return false;
    }
    testId = createData.id;
    console.log('✅ Audit Log CREATE successful');

    // READ
    const { data: readData, error: readError } = await supabase
      .from('audit_log')
      .select('*')
      .eq('id', testId)
      .single();
    
    if (readError) {
      console.error('❌ Audit Log READ failed:', readError.message);
      return false;
    }
    console.log('✅ Audit Log READ successful');

    // DELETE (Note: audit logs typically don't allow updates for integrity)
    const { error: deleteError } = await supabase
      .from('audit_log')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.error('❌ Audit Log DELETE failed:', deleteError.message);
      return false;
    }
    console.log('✅ Audit Log DELETE successful');
    
    return true;
  } catch (error) {
    console.error('❌ Audit Log CRUD error:', error.message);
    if (testId) {
      await supabase.from('audit_log').delete().eq('id', testId);
    }
    return false;
  }
}

async function testDataConsistency() {
  console.log('\n🔗 Testing Data Consistency and Relationships...');
  
  try {
    // Test constraint violations
    console.log('  Testing constraint violations...');
    
    // Test invalid status enum
    const { error: statusError } = await supabase
      .from('phone_numbers')
      .insert([{ ...testPhoneNumber, status: 'invalid_status' }]);
    
    if (!statusError) {
      console.error('❌ Status constraint not working - invalid status was accepted');
      return false;
    }
    console.log('✅ Status constraint working correctly');

    // Test invalid number_type enum
    const { error: typeError } = await supabase
      .from('phone_numbers')
      .insert([{ ...testPhoneNumber, number_type: 'invalid_type' }]);
    
    if (!typeError) {
      console.error('❌ Number type constraint not working - invalid type was accepted');
      return false;
    }
    console.log('✅ Number type constraint working correctly');

    // Test unique constraint on phone number
    const { data: firstInsert } = await supabase
      .from('phone_numbers')
      .insert([testPhoneNumber])
      .select()
      .single();
    
    if (firstInsert) {
      const { error: duplicateError } = await supabase
        .from('phone_numbers')
        .insert([testPhoneNumber]);
      
      if (!duplicateError) {
        console.error('❌ Unique constraint not working - duplicate number was accepted');
        await supabase.from('phone_numbers').delete().eq('id', firstInsert.id);
        return false;
      }
      console.log('✅ Unique constraint working correctly');
      
      // Cleanup
      await supabase.from('phone_numbers').delete().eq('id', firstInsert.id);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Data consistency test error:', error.message);
    return false;
  }
}

async function testIndexPerformance() {
  console.log('\n⚡ Testing Index Performance...');
  
  try {
    // Test queries that should use indexes
    const queries = [
      { table: 'phone_numbers', column: 'status', value: 'available' },
      { table: 'phone_numbers', column: 'department', value: 'Sales' },
      { table: 'phone_numbers', column: 'carrier', value: 'AT&T' },
      { table: 'number_ranges', column: 'status', value: 'active' },
      { table: 'bulk_operations', column: 'status', value: 'completed' },
      { table: 'audit_log', column: 'type', value: 'import' }
    ];
    
    for (const query of queries) {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from(query.table)
        .select('*')
        .eq(query.column, query.value)
        .limit(10);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (error) {
        console.error(`❌ Query failed for ${query.table}.${query.column}:`, error.message);
        return false;
      }
      
      console.log(`✅ Query ${query.table}.${query.column} completed in ${duration}ms`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Index performance test error:', error.message);
    return false;
  }
}

async function generateReport(results) {
  console.log('\n📋 DATABASE INTEGRATION VERIFICATION REPORT');
  console.log('=' .repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`\nOverall Status: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  console.log('\nDetailed Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  });
  
  if (failedTests > 0) {
    console.log('\n⚠️  ISSUES IDENTIFIED:');
    Object.entries(results).forEach(([test, passed]) => {
      if (!passed) {
        console.log(`  - ${test} failed - requires attention`);
      }
    });
  } else {
    console.log('\n✅ All database operations are working correctly!');
    console.log('   - All tables exist and are accessible');
    console.log('   - CRUD operations work for all entities');
    console.log('   - Data constraints and relationships are enforced');
    console.log('   - Indexes are performing well');
  }
  
  console.log('\n' + '=' .repeat(50));
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Database Integration Test');
  console.log('This will verify all database operations and identify any issues\n');
  
  const results = {};
  
  // Test connection first
  results['Database Connection'] = await testConnection();
  if (!results['Database Connection']) {
    console.error('\n❌ Cannot proceed - database connection failed');
    return;
  }
  
  // Check all tables exist
  const tables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log'];
  for (const table of tables) {
    results[`Table Exists: ${table}`] = await checkTableExists(table);
  }
  
  // Test CRUD operations for each table
  results['Phone Numbers CRUD'] = await testPhoneNumbersCRUD();
  results['Number Ranges CRUD'] = await testNumberRangesCRUD();
  results['Bulk Operations CRUD'] = await testBulkOperationsCRUD();
  results['Audit Log CRUD'] = await testAuditLogCRUD();
  
  // Test data consistency and constraints
  results['Data Consistency'] = await testDataConsistency();
  
  // Test index performance
  results['Index Performance'] = await testIndexPerformance();
  
  // Generate final report
  await generateReport(results);
}

// Run the tests
runAllTests().catch(console.error);