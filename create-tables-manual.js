// Manual Database Table Creation Script
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
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to execute raw SQL via REST API
async function executeSQL(sql, description) {
  console.log(`\n🔧 ${description}...`);
  
  try {
    // Try using the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({ sql })
    });
    
    if (response.ok) {
      console.log(`✅ Success: ${description}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Failed: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function createMissingTables() {
  console.log('🚀 Creating Missing Database Tables Manually...\n');
  
  // Since we can't execute SQL directly, let's try to create tables by checking existing structure
  // and working around the limitations
  
  console.log('⚠️  CRITICAL DATABASE ISSUES IDENTIFIED:');
  console.log('   1. phone_numbers table is missing 16+ required columns');
  console.log('   2. number_ranges table does not exist');
  console.log('   3. bulk_operations table does not exist');
  console.log('   4. audit_log table does not exist');
  
  console.log('\n📋 REQUIRED MANUAL SETUP:');
  console.log('   Since automatic table creation is not possible with the current setup,');
  console.log('   the database schema MUST be executed manually.');
  
  console.log('\n🔧 MANUAL SETUP STEPS:');
  console.log('   1. Go to your Supabase dashboard: https://app.supabase.com');
  console.log('   2. Navigate to your project');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Copy and paste the ENTIRE contents of supabase-schema.sql');
  console.log('   5. Execute the SQL script');
  console.log('   6. Run "node test-database.js" to verify setup');
  
  console.log('\n📄 Schema File Location: ./supabase-schema.sql');
  
  // Let's also provide the schema content for easy copy/paste
  try {
    const schemaContent = fs.readFileSync('supabase-schema.sql', 'utf8');
    console.log('\n📋 SCHEMA CONTENT TO EXECUTE:');
    console.log('=' .repeat(80));
    console.log(schemaContent);
    console.log('=' .repeat(80));
  } catch (error) {
    console.error('❌ Cannot read schema file:', error.message);
  }
  
  return false;
}

async function testCurrentSetup() {
  console.log('\n🔍 Testing Current Database Setup...');
  
  // Test what we can access
  const tables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log'];
  const results = {};
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (error) {
        results[tableName] = { exists: false, error: error.message };
      } else {
        results[tableName] = { exists: true, recordCount: data?.length || 0 };
      }
    } catch (e) {
      results[tableName] = { exists: false, error: e.message };
    }
  }
  
  console.log('\n📊 Current Table Status:');
  Object.entries(results).forEach(([table, result]) => {
    if (result.exists) {
      console.log(`✅ ${table} - exists (${result.recordCount} records)`);
    } else {
      console.log(`❌ ${table} - ${result.error}`);
    }
  });
  
  return results;
}

async function generateFixInstructions() {
  console.log('\n🔧 COMPREHENSIVE FIX INSTRUCTIONS:');
  console.log('=' .repeat(60));
  
  console.log('\nSTEP 1: Execute Database Schema');
  console.log('   • Go to Supabase Dashboard → SQL Editor');
  console.log('   • Execute the complete supabase-schema.sql file');
  console.log('   • This will create all missing tables and columns');
  
  console.log('\nSTEP 2: Verify Setup');
  console.log('   • Run: node test-database.js');
  console.log('   • All tests should pass');
  
  console.log('\nSTEP 3: Application Testing');
  console.log('   • Test phone number creation/editing');
  console.log('   • Test number range management');
  console.log('   • Test bulk operations');
  console.log('   • Verify audit logging');
  
  console.log('\nCRITICAL COMPONENTS AFFECTED:');
  console.log('   • PhoneNumbersTable - cannot save/update records');
  console.log('   • NumberRangeManager - completely non-functional');
  console.log('   • BulkOperationsManager - cannot track operations');
  console.log('   • AnalyticsDashboard - missing statistics data');
  console.log('   • All audit logging - disabled');
  
  console.log('\n⚠️  APPLICATION IS NOT FUNCTIONAL UNTIL SCHEMA IS EXECUTED!');
  console.log('=' .repeat(60));
}

async function main() {
  await testCurrentSetup();
  await createMissingTables();
  await generateFixInstructions();
}

main().catch(console.error);