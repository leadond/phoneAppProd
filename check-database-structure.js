// Check actual database structure
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

async function checkDatabaseStructure() {
  console.log('🔍 Checking Current Database Structure...\n');
  
  // Check what tables exist by querying the information_schema
  try {
    const { data: tables, error } = await supabase.rpc('sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });
    
    if (error) {
      console.log('Cannot query information_schema directly. Trying individual table checks...\n');
      
      // Manually check each expected table
      const expectedTables = ['phone_numbers', 'number_ranges', 'bulk_operations', 'audit_log'];
      console.log('📋 Table Existence Check:');
      
      for (const tableName of expectedTables) {
        try {
          const { data, error } = await supabase.from(tableName).select('*').limit(1);
          if (error) {
            console.log(`❌ ${tableName} - ${error.message}`);
          } else {
            console.log(`✅ ${tableName} - exists and accessible`);
          }
        } catch (e) {
          console.log(`❌ ${tableName} - ${e.message}`);
        }
      }
    } else {
      console.log('📋 Existing Tables:');
      if (tables && tables.length > 0) {
        tables.forEach(table => {
          console.log(`✅ ${table.table_name}`);
        });
      } else {
        console.log('❌ No tables found');
      }
    }
    
    // Check phone_numbers table structure specifically
    console.log('\n📱 Phone Numbers Table Structure:');
    try {
      const { data, error } = await supabase.from('phone_numbers').select('*').limit(1);
      if (!error && data) {
        console.log('✅ Phone Numbers table accessible');
        
        // Try to describe the table structure by attempting to select specific columns
        const expectedColumns = [
          'id', 'number', 'status', 'system', 'carrier', 'assigned_to', 'notes', 
          'extension', 'department', 'location', 'date_assigned', 'date_available', 
          'last_used', 'aging_days', 'number_type', 'range', 'project', 
          'reserved_until', 'usage_inbound', 'usage_outbound', 'usage_last_activity',
          'created_at', 'updated_at'
        ];
        
        console.log('\nColumn Check:');
        for (const column of expectedColumns) {
          try {
            const { data: colData, error: colError } = await supabase
              .from('phone_numbers')
              .select(column)
              .limit(1);
            
            if (colError) {
              console.log(`❌ ${column} - ${colError.message}`);
            } else {
              console.log(`✅ ${column} - exists`);
            }
          } catch (e) {
            console.log(`❌ ${column} - ${e.message}`);
          }
        }
      } else {
        console.log(`❌ Cannot access phone_numbers table: ${error?.message}`);
      }
    } catch (e) {
      console.log(`❌ Phone Numbers table error: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkDatabaseStructure().catch(console.error);