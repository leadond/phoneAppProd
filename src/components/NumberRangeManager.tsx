import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Building, Phone, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { dataService, NumberRange } from '../services/dataService';

export const NumberRangeManager = () => {
  const [ranges, setRanges] = useState<NumberRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<NumberRange | null>(null);
  const [newRange, setNewRange] = useState<Partial<NumberRange>>({
    name: '',
    pattern: '',
    startNumber: '',
    endNumber: '',
    carrier: '',
    location: '',
    department: '',
    notes: '',
    project: ''
  });

  useEffect(() => {
    const loadRanges = async () => {
      try {
        setLoading(true);
        setError(null);
        const rangeData = await dataService.getNumberRanges();
        setRanges(rangeData);
      } catch (error) {
        console.error('Failed to load number ranges:', error);
        setError('Failed to load number ranges. Please check your database connection.');
      } finally {
        setLoading(false);
      }
    };

    loadRanges();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateUtilization = (range: NumberRange) => {
    const used = range.assignedNumbers + range.reservedNumbers;
    return ((used / range.totalNumbers) * 100).toFixed(1);
  };

  const handleCreateRange = async () => {
    try {
      const rangeData = {
        name: newRange.name || '',
        pattern: newRange.pattern || '',
        startNumber: newRange.startNumber || '',
        endNumber: newRange.endNumber || '',
        totalNumbers: calculateTotalNumbers(newRange.startNumber || '', newRange.endNumber || ''),
        availableNumbers: calculateTotalNumbers(newRange.startNumber || '', newRange.endNumber || ''),
        assignedNumbers: 0,
        reservedNumbers: 0,
        carrier: newRange.carrier || '',
        location: newRange.location || '',
        department: newRange.department || '',
        dateCreated: new Date().toISOString().split('T')[0],
        notes: newRange.notes || '',
        status: 'pending' as const,
        project: newRange.project || null
      };

      const createdRange = await dataService.addNumberRange(rangeData);
      setRanges([...ranges, createdRange]);
      setNewRange({});
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create number range:', error);
    }
  };

  const calculateTotalNumbers = (start: string, end: string) => {
    // Simple calculation - in real app would parse number ranges properly
    const startNum = parseInt(start.replace(/\D/g, '').slice(-4));
    const endNum = parseInt(end.replace(/\D/g, '').slice(-4));
    return endNum - startNum + 1;
  };

  const totalStats = ranges.reduce((acc, range) => ({
    totalNumbers: acc.totalNumbers + range.totalNumbers,
    availableNumbers: acc.availableNumbers + range.availableNumbers,
    assignedNumbers: acc.assignedNumbers + range.assignedNumbers,
    reservedNumbers: acc.reservedNumbers + range.reservedNumbers,
  }), { totalNumbers: 0, availableNumbers: 0, assignedNumbers: 0, reservedNumbers: 0 });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Number Range Management</h1>
            <p className="text-gray-500 mt-1">Loading number ranges...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Number Range Management</h1>
            <p className="text-gray-500 mt-1">Organize and manage custom number ranges</p>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Number Range Management</h1>
          <p className="text-gray-500 mt-1">Organize and manage custom number ranges</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Range
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Number Range</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Range Name</label>
                  <Input
                    value={newRange.name || ''}
                    onChange={(e) => setNewRange({...newRange, name: e.target.value})}
                    placeholder="e.g., Houston Sales Main"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Pattern</label>
                  <Input
                    value={newRange.pattern || ''}
                    onChange={(e) => setNewRange({...newRange, pattern: e.target.value})}
                    placeholder="e.g., XXX-XXX-XXXX"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Number</label>
                  <Input
                    value={newRange.startNumber || ''}
                    onChange={(e) => setNewRange({...newRange, startNumber: e.target.value})}
                    placeholder="e.g., XXX-XXX-XXXX"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Number</label>
                  <Input
                    value={newRange.endNumber || ''}
                    onChange={(e) => setNewRange({...newRange, endNumber: e.target.value})}
                    placeholder="e.g., XXX-XXX-XXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Carrier</label>
                  <Select value={newRange.carrier || ''} onValueChange={(value) => setNewRange({...newRange, carrier: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AT&T">AT&T</SelectItem>
                      <SelectItem value="Verizon">Verizon</SelectItem>
                      <SelectItem value="Lumen">Lumen</SelectItem>
                      <SelectItem value="T-Mobile">T-Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={newRange.location || ''}
                    onChange={(e) => setNewRange({...newRange, location: e.target.value})}
                    placeholder="e.g., Houston, TX"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Select value={newRange.department || ''} onValueChange={(value) => setNewRange({...newRange, department: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Project (Optional)</label>
                  <Input
                    value={newRange.project || ''}
                    onChange={(e) => setNewRange({...newRange, project: e.target.value})}
                    placeholder="e.g., Office Expansion Q2"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={newRange.notes || ''}
                  onChange={(e) => setNewRange({...newRange, notes: e.target.value})}
                  placeholder="Additional notes about this range..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRange}>
                  Create Range
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalNumbers.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Numbers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{totalStats.assignedNumbers.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Assigned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{totalStats.availableNumbers.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{totalStats.reservedNumbers.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Reserved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{((totalStats.assignedNumbers + totalStats.reservedNumbers) / totalStats.totalNumbers * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-500">Overall Utilization</div>
          </CardContent>
        </Card>
      </div>

      {/* Range Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {ranges.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Number Ranges</h3>
            <p className="text-gray-500 mb-4">Create your first number range to get started</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Range
            </Button>
          </div>
        ) : (
          ranges.map((range) => (
          <Card key={range.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{range.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{range.pattern}</p>
                </div>
                <Badge className={getStatusBadge(range.status)}>
                  {range.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Range Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Range</div>
                  <div className="font-medium">{range.startNumber} - {range.endNumber}</div>
                </div>
                <div>
                  <div className="text-gray-500">Total Numbers</div>
                  <div className="font-medium">{range.totalNumbers.toLocaleString()}</div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Utilization</span>
                  <span>{calculateUtilization(range)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${calculateUtilization(range)}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-lg font-bold text-green-600">{range.assignedNumbers}</div>
                  <div className="text-xs text-green-700">Assigned</div>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-lg font-bold text-blue-600">{range.availableNumbers}</div>
                  <div className="text-xs text-blue-700">Available</div>
                </div>
                <div className="bg-yellow-50 p-2 rounded">
                  <div className="text-lg font-bold text-yellow-600">{range.reservedNumbers}</div>
                  <div className="text-xs text-yellow-700">Reserved</div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Building className="w-4 h-4 mr-2" />
                  {range.carrier} • {range.location}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {range.department}
                </div>
                {range.project && (
                  <div className="flex items-center text-blue-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {range.project}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2 border-t">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  View Numbers
                </Button>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
};