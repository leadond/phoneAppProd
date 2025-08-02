// Database Setup Script - Execute the complete schema
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

async function executeSQLCommand(sql, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('sql', { query: sql });
    if (error) {
      console.error(`❌ Failed: ${error.message}`);
      return false;
    }
    console.log(`✅ Success: ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Setting Up Complete Database Schema...\n');
  
  // First, let's check if we can run SQL commands
  console.log('🔍 Testing SQL execution capability...');
  const testResult = await executeSQLCommand('SELECT 1 as test', 'SQL test query');
  
  if (!testResult) {
    console.log('\n❌ Cannot execute SQL commands directly.');
    console.log('📋 MANUAL SETUP REQUIRED:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Execute the contents of supabase-schema.sql');
    console.log('   4. Run this script again to verify setup');
    return false;
  }
  
  // Read the schema file
  let schemaSQL;
  try {
    schemaSQL = fs.readFileSync('supabase-schema.sql', 'utf8');
  } catch (error) {
    console.error('❌ Cannot read supabase-schema.sql file:', error.message);
    return false;
  }
  
  // Split the schema into individual commands
  const commands = schemaSQL
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
  
  console.log(`\n📋 Found ${commands.length} SQL commands to execute\n`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const commandDescription = `Command ${i + 1}/${commands.length}`;
    
    // Skip comments and empty commands
    if (command.startsWith('--') || command.startsWith('/*') || command.trim().length === 0) {
      continue;
    }
    
    const success = await executeSQLCommand(command, commandDescription);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Schema Execution Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  
  if (failureCount === 0) {
    console.log('\n🎉 Database schema setup completed successfully!');
    return true;
  } else {
    console.log('\n⚠️  Some commands failed. Manual intervention may be required.');
    return false;
  }
}

async function verifySetup() {
  console.log('\n🔍 Verifying Database Setup...');
  
  const tables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log'];
  let allTablesExist = true;
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      if (error) {
        console.log(`❌ ${tableName} - ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${tableName} - exists and accessible`);
      }
    } catch (e) {
      console.log(`❌ ${tableName} - ${e.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function main() {
  const setupSuccess = await setupDatabase();
  
  if (setupSuccess) {
    const verifySuccess = await verifySetup();
    
    if (verifySuccess) {
      console.log('\n🎉 DATABASE SETUP COMPLETE!');
      console.log('   All tables created and accessible');
      console.log('   Ready to run database integration tests');
    } else {
      console.log('\n⚠️  Setup completed but verification failed');
      console.log('   Some tables may not be accessible');
    }
  } else {
    console.log('\n❌ DATABASE SETUP FAILED');
    console.log('   Manual setup required via Supabase dashboard');
  }
}

main().catch(console.error);