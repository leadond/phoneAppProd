import React, { useState, useEffect } from 'react';
import { browserDatabase } from '../lib/browserDatabase';

interface DatabaseStats {
  totalRecords: number;
  sampleRecords: any[];
  error?: string;
}

export const DatabaseDiagnostics: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats>({ totalRecords: 0, sampleRecords: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      await browserDatabase.ensureInitialized();
      
      // Count total records
      const totalRecords = await browserDatabase.count('phone_numbers');

      // Get first 20 records as samples
      const sampleRecords = await browserDatabase.getAllPhoneNumbers(0, 20);

      setStats({ totalRecords, sampleRecords });
    } catch (error) {
      console.error('Database check failed:', error);
      setStats({ totalRecords: 0, sampleRecords: [], error: String(error) });
    }
    setLoading(false);
  };

  const clearDatabase = async () => {
    if (!confirm('Are you sure you want to clear all phone number data? This cannot be undone.')) {
      return;
    }

    try {
      await browserDatabase.ensureInitialized();
      await browserDatabase.clear('phone_numbers');
      await checkDatabase(); // Refresh stats
      alert('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
      alert('Failed to clear database: ' + error);
    }
  };

  const removeSampleNumbers = async () => {
    if (!confirm('Remove all phone numbers starting with 0? Real phone numbers do not start with 0, so these are likely sample/test data.')) {
      return;
    }

    try {
      await browserDatabase.ensureInitialized();
      
      // Get all phone numbers
      const allNumbers = await browserDatabase.getAllPhoneNumbers();
      console.log(`Found ${allNumbers.length} total phone numbers`);
      
      // Filter numbers that start with 0 (invalid sample data)
      const sampleNumbers = allNumbers.filter(phone => {
        const number = phone.number || phone.phoneNumber || '';
        // Remove any formatting and check if it starts with 0
        const cleanNumber = number.replace(/[^0-9]/g, '');
        return cleanNumber.length === 10 && cleanNumber.startsWith('0');
      });
      
      console.log(`Found ${sampleNumbers.length} sample numbers starting with 0`);
      
      if (sampleNumbers.length === 0) {
        alert('No sample numbers starting with 0 found. Database is clean!');
        return;
      }
      
      // Remove each sample number
      let removed = 0;
      let failed = 0;
      
      for (const phone of sampleNumbers) {
        try {
          const success = await browserDatabase.deletePhoneNumber(phone.id);
          if (success) {
            removed++;
            console.log(`Removed: ${phone.number}`);
          } else {
            failed++;
            console.log(`Failed to remove: ${phone.number}`);
          }
        } catch (error) {
          failed++;
          console.log(`Error removing ${phone.number}:`, error.message);
        }
      }
      
      // Add audit log entry
      await browserDatabase.insertAuditEntry({
        action: `Removed ${removed} sample phone numbers starting with 0`,
        user: 'admin',
        type: 'cleanup',
        details: { removed, failed, total: sampleNumbers.length }
      });
      
      await checkDatabase(); // Refresh stats
      alert(`Cleanup completed!\nRemoved: ${removed} sample numbers\nFailed: ${failed}\nRemaining numbers: ${stats.totalRecords - removed}`);
      
    } catch (error) {
      console.error('Failed to remove sample numbers:', error);
      alert('Failed to remove sample numbers: ' + error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading database diagnostics...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Database Diagnostics</h2>
      
      {stats.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {stats.error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">Database Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Phone Numbers</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalRecords.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Database Status</p>
            <p className="text-lg font-semibold text-green-600">
              {stats.totalRecords > 0 ? 'Contains Data' : 'Empty'}
            </p>
          </div>
        </div>
      </div>

      {stats.sampleRecords.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-3">Sample Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.sampleRecords.map((record, index) => (
                  <tr key={record.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.status || 'available'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.assigned_to || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={checkDatabase}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Diagnostics
        </button>
        
        {stats.totalRecords > 0 && (
          <>
            <button
              onClick={removeSampleNumbers}
              className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
            >
              Remove Sample Numbers (0-prefix)
            </button>
            
            <button
              onClick={clearDatabase}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear Database
            </button>
          </>
        )}
      </div>

      {stats.totalRecords === 0 && (
        <div className="mt-6 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-bold">No Data Found</p>
          <p>The database appears to be empty. If you previously uploaded phone numbers, they may have been cleared. You will need to re-upload your data using the Import/Export functionality.</p>
        </div>
      )}
    </div>
  );
};