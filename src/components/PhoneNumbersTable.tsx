import React, { useState } from 'react';
import { Search, Filter, Download, Phone, AlertTriangle } from 'lucide-react';

interface PhoneNumber {
  id: string;
  number: string;
  status: string;
  system: string;
  carrier: string;
  assignedTo: string | null;
  notes: string;
  extension: string;
}

export const PhoneNumbersTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDuplicateExtensions, setShowDuplicateExtensions] = useState(false);

  // No mock data - this component should load real data from database
  const mockNumbers: PhoneNumber[] = [];

  // Helper function to normalize phone number for search (remove dashes)
  const normalizePhoneNumber = (number: string) => {
    return number.replace(/-/g, '');
  };

  // Helper function to get last 5 digits from phone number
  const getLastFiveDigits = (number: string) => {
    const normalized = normalizePhoneNumber(number);
    return normalized.slice(-5);
  };

  // Find duplicate extensions based on last 5 digits of phone number
  const findDuplicateExtensions = (): Record<string, PhoneNumber[]> => {
    const extensionMap: Record<string, PhoneNumber[]> = {};
    mockNumbers.forEach(number => {
      const lastFive = getLastFiveDigits(number.number);
      if (!extensionMap[lastFive]) {
        extensionMap[lastFive] = [];
      }
      extensionMap[lastFive].push(number);
    });
    
    return Object.entries(extensionMap)
      .filter(([ext, numbers]) => numbers.length > 1)
      .reduce((acc, [ext, numbers]) => {
        acc[ext] = numbers;
        return acc;
      }, {} as Record<string, PhoneNumber[]>);
  };

  const duplicateExtensions = findDuplicateExtensions();

  const filteredNumbers = mockNumbers.filter(number => {
    const normalizedNumber = normalizePhoneNumber(number.number);
    const normalizedSearch = normalizePhoneNumber(searchTerm);
    
    const matchesSearch = 
      normalizedNumber.includes(normalizedSearch) || 
      number.extension.includes(searchTerm) ||
      (number.assignedTo && number.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || number.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      assigned: 'bg-green-100 text-green-800',
      available: 'bg-blue-100 text-blue-800',
      reserved: 'bg-yellow-100 text-yellow-800',
      blocked: 'bg-red-100 text-red-800',
    };
    
    return `px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`;
  };

  const isDuplicateExtension = (number: PhoneNumber) => {
    const lastFive = getLastFiveDigits(number.number);
    return duplicateExtensions[lastFive] && duplicateExtensions[lastFive].length > 1;
  };

  const getDuplicateWarning = (number: PhoneNumber) => {
    const lastFive = getLastFiveDigits(number.number);
    const duplicates = duplicateExtensions[lastFive];
    if (!duplicates || duplicates.length <= 1) return null;
    
    const otherNumbers = duplicates.filter(n => n.id !== number.id);
    const hasConflict = otherNumbers.some(n => 
      n.assignedTo !== number.assignedTo || n.system !== number.system
    );
    
    return hasConflict;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Phone Numbers</h1>
          <p className="text-gray-500 mt-1">Manage and track phone number assignments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicateExtensions(!showDuplicateExtensions)}
            className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
              showDuplicateExtensions 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Duplicate Extensions ({Object.keys(duplicateExtensions).length})</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by number (with/without dashes), extension, or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tip: Search "12345" for extension, "XXXXXXXXXX" without dashes, or "XXX-XXX-XXXX" with dashes
            </p>
          </div>
          
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="blocked">Blocked</option>
            </select>
            
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>More Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Extensions Alert */}
      {showDuplicateExtensions && Object.keys(duplicateExtensions).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Duplicate Extensions Found</h3>
          <div className="space-y-2">
            {Object.entries(duplicateExtensions).map(([ext, numbers]) => (
              <div key={ext} className="text-sm">
                <span className="font-medium text-yellow-800">Last 5 digits {ext}:</span>
                <div className="ml-4">
                  {numbers.map(number => (
                    <div key={number.id} className="flex justify-between items-center py-1">
                      <span>{number.number} - {number.assignedTo || 'Unassigned'} ({number.system})</span>
                      {getDuplicateWarning(number) && (
                        <span className="text-red-600 text-xs">⚠ Override Active</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Extension
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNumbers.map((number) => (
                <tr key={number.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">{number.number}</span>
                      {isDuplicateExtension(number) && (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 ml-2" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-mono text-sm ${
                      isDuplicateExtension(number) ? 'text-yellow-700 font-semibold' : 'text-gray-900'
                    }`}>
                      {number.extension}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(number.status)}>
                      {number.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {number.system}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {number.carrier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {number.assignedTo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {number.notes || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-4">
                      Edit
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing {filteredNumbers.length} of {mockNumbers.length} phone numbers
          </p>
        </div>
      </div>
    </div>
  );
};
