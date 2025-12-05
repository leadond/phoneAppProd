import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Phone, AlertTriangle, Clock, Users, Building, MapPin, Calendar, Eye, Edit, Trash2, Lock, Unlock, RefreshCw, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dataService, PhoneNumber } from '../services/dataService';
import { PhoneNumberAssignmentDialog } from './PhoneNumberAssignmentDialog';
import BulkEditToolbar from './BulkEditToolbar';
import { toast } from 'sonner';

export const EnhancedPhoneNumbersTable = ({ filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [systemFilter, setSystemFilter] = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [numberTypeFilter, setNumberTypeFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState('all');
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [numbersToAssign, setNumbersToAssign] = useState<PhoneNumber[]>([]);

  // Constants for pagination
  const INITIAL_LOAD_SIZE = 1000; // Load first 1000 numbers immediately
  const BACKGROUND_BATCH_SIZE = 500; // Load 500 numbers per background batch

  const loadInitialPhoneNumbers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get total count first
      const totalCount = await dataService.getPhoneNumbersCount(filters);
      setTotalCount(totalCount);
      
      // Load first batch (1000 numbers or all if less than 1000)
      const initialBatchSize = Math.min(INITIAL_LOAD_SIZE, totalCount);
      const initialNumbers = await dataService.getPhoneNumbers(0, initialBatchSize, filters);
      setPhoneNumbers(initialNumbers);
      setLoadedCount(initialNumbers.length);
      
      console.log(`Loaded initial batch: ${initialNumbers.length} of ${totalCount} phone numbers`);
      
      // Page is now ready - user can interact
      setLoading(false);
      
      // Start background loading if there are more numbers to load
      if (totalCount > initialBatchSize) {
        loadRemainingNumbersInBackground(initialBatchSize, totalCount);
      }
      
    } catch (error) {
      console.error('Failed to load phone numbers:', error);
      setError('Failed to load phone numbers. Please check your database connection.');
      setLoading(false);
    }
  };

  const loadRemainingNumbersInBackground = async (startOffset: number, totalCount: number) => {
    setBackgroundLoading(true);
    let currentOffset = startOffset;
    
    try {
      while (currentOffset < totalCount) {
        // Load next batch in background
        const batchSize = Math.min(BACKGROUND_BATCH_SIZE, totalCount - currentOffset);
        const nextBatch = await dataService.getPhoneNumbers(currentOffset, batchSize);
        
        // Update state with new numbers
        setPhoneNumbers(prev => [...prev, ...nextBatch]);
        setLoadedCount(prev => prev + nextBatch.length);
        
        currentOffset += batchSize;
        
        console.log(`Background loaded: ${currentOffset} of ${totalCount} phone numbers`);
        
        // Small delay to prevent blocking the UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log('Background loading completed');
    } catch (error) {
      console.error('Background loading failed:', error);
    } finally {
      setBackgroundLoading(false);
    }
  };

  // Refresh function for manual reload
  const loadPhoneNumbers = async (forceReload: boolean = false) => {
    if (forceReload) {
      setPhoneNumbers([]);
      setLoadedCount(0);
      setTotalCount(0);
    }
    await loadInitialPhoneNumbers();
  };

  useEffect(() => {
    loadInitialPhoneNumbers();
  }, [filters]);

  // Advanced search functionality
  const filteredNumbers = useMemo(() => {
    let filtered = phoneNumbers.filter(number => {
      // Text search across multiple fields
      const searchFields = [
        (number.number || '').replace(/-/g, ''),
        number.extension || '',
        number.assignedTo || '',
        number.department || '',
        number.location || '',
        number.notes || '',
        number.carrier || '',
        number.system || '',
        number.range || ''
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchTerm === '' || searchFields.includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || number.status === statusFilter;
      
      // System filter
      const matchesSystem = systemFilter === 'all' || number.system === systemFilter;
      
      // Carrier filter
      const matchesCarrier = carrierFilter === 'all' || number.carrier === carrierFilter;
      
      // Department filter
      const matchesDepartment = departmentFilter === 'all' || number.department === departmentFilter;
      
      // Number type filter
      const matchesNumberType = numberTypeFilter === 'all' || number.numberType === numberTypeFilter;
      
      // View-specific filters
      if (currentView === 'available') return matchesSearch && number.status === 'available';
      if (currentView === 'assigned') return matchesSearch && number.status === 'assigned';
      if (currentView === 'aging') return matchesSearch && number.status === 'aging';
      if (currentView === 'toll-free') return matchesSearch && number.numberType === 'toll-free';
      
      return matchesSearch && matchesStatus && matchesSystem && matchesCarrier && matchesDepartment && matchesNumberType;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof PhoneNumber];
      let bValue: any = b[sortBy as keyof PhoneNumber];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [phoneNumbers, searchTerm, statusFilter, systemFilter, carrierFilter, departmentFilter, numberTypeFilter, sortBy, sortOrder, currentView]);

  // Get unique values for filter dropdowns
  const uniqueSystems = [...new Set(phoneNumbers.map(n => n.system))];
  const uniqueCarriers = [...new Set(phoneNumbers.map(n => n.carrier))];
  const uniqueDepartments = [...new Set(phoneNumbers.map(n => n.department))];

  // Statistics for dashboard
  const stats = {
    total: phoneNumbers.length,
    available: phoneNumbers.filter(n => n.status === 'available').length,
    assigned: phoneNumbers.filter(n => n.status === 'assigned').length,
    aging: phoneNumbers.filter(n => n.status === 'aging').length,
    tollFree: phoneNumbers.filter(n => n.numberType === 'toll-free').length,
    reserved: phoneNumbers.filter(n => n.status === 'reserved').length
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      assigned: 'bg-green-100 text-green-800',
      available: 'bg-blue-100 text-blue-800',
      reserved: 'bg-yellow-100 text-yellow-800',
      aging: 'bg-orange-100 text-orange-800',
      blocked: 'bg-red-100 text-red-800',
      'toll-free': 'bg-purple-100 text-purple-800',
    };
    
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getNumberTypeIcon = (type: string) => {
    switch (type) {
      case 'toll-free': return <Phone className="w-4 h-4 text-purple-500" />;
      case 'international': return <MapPin className="w-4 h-4 text-blue-500" />;
      default: return <Phone className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleBulkAction = (action: string) => {
    if (action === 'assign') {
      const selectedPhoneNumbers = phoneNumbers.filter(num => selectedNumbers.includes(num.id));
      setNumbersToAssign(selectedPhoneNumbers);
      setAssignmentDialogOpen(true);
    } else if (action === 'release') {
      handleBulkRelease();
    } else if (action === 'tag') {
      handleBulkTag();
    }
  };

  const handleBulkRelease = async () => {
    try {
      const selectedPhoneNumbers = phoneNumbers.filter(num => selectedNumbers.includes(num.id));
      const assignedNumbers = selectedPhoneNumbers.filter(num => num.status === 'assigned');
      
      if (assignedNumbers.length === 0) {
        alert('No assigned numbers selected for release.');
        return;
      }

      const now = new Date().toISOString();
      for (const number of assignedNumbers) {
        await dataService.updatePhoneNumber(number.id, {
          status: 'available',
          assignedTo: null,
          dateAssigned: null,
          dateAvailable: now,
          system: 'Unassigned',
          notes: ''
        });
      }

      await loadPhoneNumbers();
      setSelectedNumbers([]);
    } catch (error) {
      console.error('Failed to release numbers:', error);
      alert('Failed to release numbers. Please try again.');
    }
  };

  const handleBulkReserve = async () => {
    const projectName = prompt('Enter project name for reservation:');
    if (!projectName) return;

    try {
      const result = await dataService.bulkReserveNumbers(selectedNumbers, projectName);
      if (result.success > 0) {
        await loadPhoneNumbers();
        setSelectedNumbers([]);
      }
      if (result.failed > 0) {
        alert(`${result.failed} numbers failed to reserve: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Failed to reserve numbers:', error);
      alert('Failed to reserve numbers. Please try again.');
    }
  };

  const handleBulkTag = async () => {
    const tagName = prompt('Enter tag to add:');
    if (!tagName) return;

    try {
      // For simplicity, we'll assume the tag already exists.
      // A more robust implementation would allow creating new tags here.
      const tags = await dataService.getTags();
      const tag = tags.find(t => t.name === tagName);

      if (!tag) {
        toast.error(`Tag "${tagName}" not found. Please create it first in the Tag Management settings.`);
        return;
      }

      for (const numberId of selectedNumbers) {
        await dataService.addTagToPhoneNumber(numberId, tag.id);
      }

      toast.success(`Tag "${tagName}" added to ${selectedNumbers.length} numbers.`);
      setSelectedNumbers([]);
    } catch (error) {
      console.error('Failed to add tag to numbers:', error);
      alert('Failed to add tag. Please try again.');
    }
  };

  const handleIndividualAssign = (number: PhoneNumber) => {
    setNumbersToAssign([number]);
    setAssignmentDialogOpen(true);
  };

  const handleAssignmentComplete = async () => {
    await loadPhoneNumbers();
    setSelectedNumbers([]);
  };

  const exportPhoneNumbers = async () => {
    try {
      // Import the generateCSV function from dataService
      const { generateCSV } = await import('../services/dataService');
      
      const csvContent = generateCSV(filteredNumbers);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phone_numbers_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export phone numbers. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phone Number Management</h1>
            <p className="text-gray-500 mt-1">Loading first {INITIAL_LOAD_SIZE.toLocaleString()} phone numbers...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparing phone number management interface...</p>
            <p className="text-sm text-gray-500 mt-2">Page will be ready for use momentarily</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Phone Number Management</h1>
            <p className="text-gray-500 mt-1">Advanced number inventory and lifecycle management</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Phone Number Management</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-500">Advanced number inventory and lifecycle management</p>
            {backgroundLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading numbers in background ({loadedCount.toLocaleString()} of {totalCount.toLocaleString()})</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
          </Button>
          <Button variant="outline" onClick={() => loadPhoneNumbers(true)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportPhoneNumbers}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Numbers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.assigned}</div>
            <div className="text-sm text-gray-500">Assigned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.available}</div>
            <div className="text-sm text-gray-500">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.aging}</div>
            <div className="text-sm text-gray-500">Aging</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.tollFree}</div>
            <div className="text-sm text-gray-500">Toll-Free</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.reserved}</div>
            <div className="text-sm text-gray-500">Reserved</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Main Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by number, extension, assignee, department, location, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Filter Tabs */}
            <Tabs value={currentView} onValueChange={setCurrentView}>
              <TabsList>
                <TabsTrigger value="all">All Numbers</TabsTrigger>
                <TabsTrigger value="available">Available ({stats.available})</TabsTrigger>
                <TabsTrigger value="assigned">Assigned ({stats.assigned})</TabsTrigger>
                <TabsTrigger value="aging">Aging ({stats.aging})</TabsTrigger>
                <TabsTrigger value="toll-free">Toll-Free ({stats.tollFree})</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="aging">Aging</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="System" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Systems</SelectItem>
                    {uniqueSystems.map(system => (
                      <SelectItem key={system} value={system}>{system}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {uniqueCarriers.map(carrier => (
                      <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={numberTypeFilter} onValueChange={setNumberTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Number Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="toll-free">Toll-Free</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedNumbers.length > 0 && (
        <BulkEditToolbar
          selectedCount={selectedNumbers.length}
          onBulkAction={handleBulkAction}
        />
      )}

      {/* Enhanced Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNumbers(filteredNumbers.map(n => n.id));
                        } else {
                          setSelectedNumbers([]);
                        }
                      }}
                      checked={selectedNumbers.length === filteredNumbers.length && filteredNumbers.length > 0}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number / Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status / System
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage / Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNumbers.map((number) => (
                  <tr key={number.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedNumbers.includes(number.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNumbers([...selectedNumbers, number.id]);
                          } else {
                            setSelectedNumbers(selectedNumbers.filter(id => id !== number.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getNumberTypeIcon(number.numberType)}
                        <div className="ml-2">
                          <div className="font-medium text-gray-900">{number.number}</div>
                          <div className="text-sm text-gray-500">Ext: {number.extension}</div>
                          <div className="text-xs text-gray-400">{number.range}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusBadge(number.status)}>
                        {number.status}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">{number.system}</div>
                      <div className="text-xs text-gray-400">{number.carrier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {number.assignedTo || 'Unassigned'}
                      </div>
                      <div className="text-sm text-gray-500">{number.department}</div>
                      <div className="text-xs text-gray-400">{number.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        In: {number.usage.inbound} | Out: {number.usage.outbound}
                      </div>
                      <div className="text-xs text-gray-500">
                        {number.lastUsed ? `Last: ${new Date(number.lastUsed).toLocaleDateString()}` : 'Never used'}
                      </div>
                      {number.agingDays > 0 && (
                        <div className="text-xs text-orange-600">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Aging {number.agingDays} days
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {number.project && (
                        <div className="text-xs text-blue-600">{number.project}</div>
                      )}
                      {number.reservedUntil && (
                        <div className="text-xs text-yellow-600">
                          Reserved until {new Date(number.reservedUntil).toLocaleDateString()}
                        </div>
                      )}
                      {!number.project && !number.reservedUntil && (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {number.status === 'available' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleIndividualAssign(number)}
                            title="Assign Number"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Refresh">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700">
                  Showing {filteredNumbers.length} of {phoneNumbers.length} phone numbers
                  {totalCount > 0 && phoneNumbers.length < totalCount && (
                    <span className="ml-2 text-blue-600">
                      ({loadedCount.toLocaleString()} of {totalCount.toLocaleString()} loaded)
                    </span>
                  )}
                  {phoneNumbers.length === 0 && (
                    <span className="ml-2 text-blue-600">
                      - Ready for data upload
                    </span>
                  )}
                </p>
                {backgroundLoading && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                    <span>Loading additional numbers...</span>
                  </div>
                )}
              </div>
              {phoneNumbers.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.hash = '#/bulk'}
                >
                  Import Numbers
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <PhoneNumberAssignmentDialog
        isOpen={assignmentDialogOpen}
        onClose={() => setAssignmentDialogOpen(false)}
        numbers={numbersToAssign}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </div>
  );
};