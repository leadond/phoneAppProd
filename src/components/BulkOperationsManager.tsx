import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Users, Lock, Unlock, Trash2, RefreshCw, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { dataService, BulkOperation, PhoneNumber, parseCSV, generateCSV } from '../services/dataService';
import { uploadFile } from '../lib/api';
import { apiService } from '../services/api';

export const BulkOperationsManager = () => {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOperations = async () => {
      try {
        setLoading(true);
        const operationData = await dataService.getBulkOperations();
        setOperations(operationData);
      } catch (error) {
        console.error('Failed to load bulk operations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOperations();
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSettings, setImportSettings] = useState({
    skipDuplicates: true,
    validateNumbers: true,
    defaultCarrier: 'AT&T',
    defaultDepartment: 'Unassigned',
    defaultStatus: 'available'
  });

  const [bulkAssignSettings, setBulkAssignSettings] = useState({
    assignTo: '',
    department: '',
    system: '',
    notes: ''
  });

  const [bulkReserveSettings, setBulkReserveSettings] = useState({
    projectName: '',
    reservationPeriod: '90', // days
    notes: ''
  });

  const [isBulkReserveDialogOpen, setIsBulkReserveDialogOpen] = useState(false);

  const [transformSettings, setTransformSettings] = useState({
    fromFormat: 'e164',
    toFormat: '10digit',
    addExtensions: false,
    extensionPattern: 'last4'
  });

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [isTransformDialogOpen, setIsTransformDialogOpen] = useState(false);
  
  // Loading states
  const [isImporting, setIsImporting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Error states
  const [transformError, setTransformError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const startImport = async () => {
    if (!selectedFile) return;

    try {
      setIsImporting(true);
      setImportError(null);

      const newOperation: BulkOperation = {
        id: Date.now().toString(),
        type: 'import',
        status: 'pending',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
        failedItems: 0,
        startTime: new Date().toISOString(),
        details: `Importing ${selectedFile.name}`
      };

      const createdOperation = await dataService.addBulkOperation(newOperation);
      setOperations([createdOperation, ...operations]);
      setIsImportDialogOpen(false);

      await processFileImport(selectedFile, createdOperation.id);
      setSelectedFile(null);
    } catch (error) {
      console.error('Import initiation failed:', error);
      setImportError(`Failed to start import: ${error}`);
    } finally {
      setIsImporting(false);
    }
  };

  const processFileImport = async (file: File, operationId: string) => {
    try {
      // Set operation to running; totalItems is unknown until backend responds,
      // so we will approximate using success_count + error_count.
      updateOperation(operationId, {
        status: 'running',
        progress: 0,
      });

      const result = await uploadFile(file);
      const totalItems = result.success_count + result.error_count;

      updateOperation(operationId, {
        status: 'completed',
        progress: 100,
        totalItems,
        processedItems: result.success_count,
        failedItems: result.error_count,
        endTime: new Date().toISOString(),
        results: result,
      });
    } catch (error) {
      console.error('Import failed via FastAPI:', error);
      updateOperation(operationId, {
        status: 'failed',
        progress: 0,
        endTime: new Date().toISOString(),
        results: { error: String(error) },
      });
    }
  };

  const updateOperation = (operationId: string, updates: Partial<BulkOperation>) => {
    setOperations(prev => prev.map(op =>
      op.id === operationId ? { ...op, ...updates } : op
    ));
  };

  const startBulkAssign = (selectedNumbers: string[]) => {
    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'assign',
      status: 'pending',
      progress: 0,
      totalItems: selectedNumbers.length,
      processedItems: 0,
      failedItems: 0,
      startTime: new Date().toISOString(),
      details: `Bulk assigning ${selectedNumbers.length} numbers to ${bulkAssignSettings.assignTo}`
    };

    setOperations([newOperation, ...operations]);
    setIsBulkAssignDialogOpen(false);

    simulateOperation(newOperation.id, 'assign');
  };

  const startBulkReserve = async (selectedNumbers: string[]) => {
    if (!bulkReserveSettings.projectName.trim()) {
      alert('Please enter a project name for the reservation');
      return;
    }

    try {
      const newOperation: BulkOperation = {
        id: Date.now().toString(),
        type: 'reserve',
        status: 'pending',
        progress: 0,
        totalItems: selectedNumbers.length,
        processedItems: 0,
        failedItems: 0,
        startTime: new Date().toISOString(),
        details: `Bulk reserving ${selectedNumbers.length} numbers for project: ${bulkReserveSettings.projectName}`
      };

      const createdOperation = await dataService.addBulkOperation(newOperation);
      setOperations([createdOperation, ...operations]);
      setIsBulkReserveDialogOpen(false);

      // Process the bulk reservation
      const results = await dataService.bulkReserveNumbers(selectedNumbers, bulkReserveSettings.projectName);
      
      // Update operation as completed
      updateOperation(createdOperation.id, {
        status: 'completed',
        progress: 100,
        processedItems: results.success,
        failedItems: results.failed,
        endTime: new Date().toISOString(),
        results
      });

    } catch (error) {
      console.error('Bulk reservation failed:', error);
    }
  };

  const simulateOperation = (operationId: string, type: string) => {
    const updateOperation = (updates: Partial<BulkOperation>) => {
      setOperations(prev => prev.map(op => 
        op.id === operationId ? { ...op, ...updates } : op
      ));
    };

    updateOperation({ status: 'running' });

    const interval = setInterval(() => {
      setOperations(prev => {
        const operation = prev.find(op => op.id === operationId);
        if (!operation || operation.status !== 'running') {
          clearInterval(interval);
          return prev;
        }

        const newProgress = Math.min(operation.progress + Math.random() * 15, 100);
        const newProcessed = Math.floor((newProgress / 100) * operation.totalItems);
        const newFailed = Math.floor(Math.random() * 3);

        if (newProgress >= 100) {
          clearInterval(interval);
          return prev.map(op => 
            op.id === operationId 
              ? { 
                  ...op, 
                  status: 'completed', 
                  progress: 100, 
                  processedItems: operation.totalItems - newFailed,
                  failedItems: newFailed,
                  endTime: new Date().toISOString()
                }
              : op
          );
        }

        return prev.map(op => 
          op.id === operationId 
            ? { ...op, progress: newProgress, processedItems: newProcessed, failedItems: newFailed }
            : op
        );
      });
    }, 500);
  };

  const startTransformation = async () => {
    try {
      setIsTransforming(true);
      setTransformError(null);

      const newOperation: BulkOperation = {
        id: Date.now().toString(),
        type: 'transform',
        status: 'pending',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
        failedItems: 0,
        startTime: new Date().toISOString(),
        details: `Transform numbers from ${transformSettings.fromFormat} to ${transformSettings.toFormat}`
      };

      const createdOperation = await dataService.addBulkOperation(newOperation);
      setOperations([createdOperation, ...operations]);
      setIsTransformDialogOpen(false);

      // Get all phone numbers for transformation
      const phoneNumbers = await dataService.getPhoneNumbers();
      
      if (phoneNumbers.length === 0) {
        throw new Error('No phone numbers found to transform');
      }
      
      // Update operation with total items
      updateOperation(createdOperation.id, {
        status: 'running',
        totalItems: phoneNumbers.length,
        progress: 0
      });

      // Process transformation
      let processedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const phoneNumber of phoneNumbers) {
        try {
          const transformedNumber = transformPhoneNumber(phoneNumber.number, transformSettings.fromFormat, transformSettings.toFormat);
          let extension = phoneNumber.extension;

          // Generate extension if requested
          if (transformSettings.addExtensions) {
            extension = generateExtension(phoneNumber.number, transformSettings.extensionPattern, processedCount);
          }

          // Update the phone number
          await dataService.updatePhoneNumber(phoneNumber.id, {
            number: transformedNumber,
            extension: extension
          });

          processedCount++;
        } catch (error) {
          failedCount++;
          errors.push(`Failed to transform ${phoneNumber.number}: ${error}`);
        }

        // Update progress
        const progress = ((processedCount + failedCount) / phoneNumbers.length) * 100;
        updateOperation(createdOperation.id, {
          progress,
          processedItems: processedCount,
          failedItems: failedCount
        });

        // Small delay to prevent blocking UI
        if ((processedCount + failedCount) % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Mark operation as completed
      updateOperation(createdOperation.id, {
        status: 'completed',
        progress: 100,
        processedItems: processedCount,
        failedItems: failedCount,
        endTime: new Date().toISOString(),
        results: {
          success: processedCount,
          failed: failedCount,
          errors: errors.slice(0, 10) // Keep only first 10 errors
        }
      });

    } catch (error) {
      console.error('Transformation failed:', error);
      setTransformError(`Transformation failed: ${error}`);
      
      // Update operation as failed if it exists
      const operations = await dataService.getBulkOperations();
      const lastOperation = operations[0];
      if (lastOperation && lastOperation.type === 'transform' && lastOperation.status === 'running') {
        updateOperation(lastOperation.id, {
          status: 'failed',
          endTime: new Date().toISOString(),
          results: { error: String(error) }
        });
      }
    } finally {
      setIsTransforming(false);
    }
  };

  const transformPhoneNumber = (number: string, fromFormat: string, toFormat: string): string => {
    // Remove all non-digit characters to get raw number
    const digits = number.replace(/\D/g, '');
    
    // Handle US numbers (assume 10 digits, add country code if needed)
    let normalizedDigits = digits;
    if (digits.length === 10) {
      normalizedDigits = '1' + digits; // Add US country code
    } else if (digits.length === 11 && digits.startsWith('1')) {
      normalizedDigits = digits;
    } else {
      throw new Error('Invalid phone number format');
    }

    // Format based on target format
    switch (toFormat) {
      case 'e164':
        return '+' + normalizedDigits;
      case '10digit':
        return normalizedDigits.slice(-10); // Remove country code
      case 'dashed':
        const area = normalizedDigits.slice(-10, -7);
        const exchange = normalizedDigits.slice(-7, -4);
        const number_part = normalizedDigits.slice(-4);
        return `${area}-${exchange}-${number_part}`;
      case 'dotted':
        const area_dot = normalizedDigits.slice(-10, -7);
        const exchange_dot = normalizedDigits.slice(-7, -4);
        const number_dot = normalizedDigits.slice(-4);
        return `${area_dot}.${exchange_dot}.${number_dot}`;
      default:
        return number; // Return original if format not recognized
    }
  };

  const generateExtension = (phoneNumber: string, pattern: string, index: number): string => {
    const digits = phoneNumber.replace(/\D/g, '');
    
    switch (pattern) {
      case 'last4':
        return digits.slice(-4);
      case 'last5':
        return digits.slice(-5);
      case 'sequential':
        return String(index + 1).padStart(4, '0');
      default:
        return digits.slice(-4);
    }
  };

  const exportTemplate = (type: string) => {
    const templates = {
      import: 'number,extension,carrier,department,assignedTo,notes,system,location,numberType,range\nXXX-XXX-XXXX,12345,AT&T,Sales,Employee Name,Primary line,Microsoft Teams,Houston TX,local,XXX-XXX-XXXX',
      ranges: 'name,pattern,startNumber,endNumber,carrier,location,department\nHouston Sales,XXX-XXX-XXXX,XXX-XXX-1000,XXX-XXX-1999,AT&T,Houston TX,Sales'
    };

    const blob = new Blob([templates[type as keyof typeof templates]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllNumbers = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      
      const phoneNumbers = await dataService.getPhoneNumbers();
      
      if (phoneNumbers.length === 0) {
        throw new Error('No phone numbers found to export');
      }
      
      const csvContent = generateCSV(phoneNumbers);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phone_numbers_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed': return <X className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Operations</h1>
            <p className="text-gray-500 mt-1">Loading operations...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-500 mt-1">Import, export, and bulk operations for phone numbers</p>
        </div>
      </div>

      {/* Error Messages */}
      {(importError || transformError || exportError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              {importError && <p className="text-red-700 mb-1">{importError}</p>}
              {transformError && <p className="text-red-700 mb-1">{transformError}</p>}
              {exportError && <p className="text-red-700">{exportError}</p>}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="operations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="import">Import/Export</TabsTrigger>
          <TabsTrigger value="transform">Transform</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Import Numbers</h3>
                    <p className="text-sm text-gray-500">Upload CSV file</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Phone Numbers</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">CSV File</label>
                    <Input type="file" accept=".csv" onChange={handleFileUpload} />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a CSV file with columns: number, extension, carrier, department, assignedTo, notes
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Default Carrier</label>
                      <Select value={importSettings.defaultCarrier} onValueChange={(value) => 
                        setImportSettings({...importSettings, defaultCarrier: value})}>
                        <SelectTrigger>
                          <SelectValue />
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
                      <label className="text-sm font-medium">Default Department</label>
                      <Select value={importSettings.defaultDepartment} onValueChange={(value) => 
                        setImportSettings({...importSettings, defaultDepartment: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Unassigned">Unassigned</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={importSettings.skipDuplicates}
                        onChange={(e) => setImportSettings({...importSettings, skipDuplicates: e.target.checked})}
                      />
                      <span className="text-sm">Skip duplicate numbers</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={importSettings.validateNumbers}
                        onChange={(e) => setImportSettings({...importSettings, validateNumbers: e.target.checked})}
                      />
                      <span className="text-sm">Validate number formats</span>
                    </label>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => exportTemplate('import')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                    <div className="space-x-2">
                      <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={startImport} disabled={!selectedFile || isImporting}>
                        {isImporting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          'Start Import'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Card
              className={`cursor-pointer hover:shadow-md transition-shadow ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={isExporting ? undefined : exportAllNumbers}
            >
              <CardContent className="p-6 text-center">
                {isExporting ? (
                  <RefreshCw className="w-8 h-8 text-green-500 mx-auto mb-2 animate-spin" />
                ) : (
                  <Download className="w-8 h-8 text-green-500 mx-auto mb-2" />
                )}
                <h3 className="font-semibold">
                  {isExporting ? 'Exporting...' : 'Export Numbers'}
                </h3>
                <p className="text-sm text-gray-500">Download CSV</p>
              </CardContent>
            </Card>

            <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Bulk Assign</h3>
                    <p className="text-sm text-gray-500">Assign multiple numbers</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Assignment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Assign To</label>
                    <Input 
                      value={bulkAssignSettings.assignTo}
                      onChange={(e) => setBulkAssignSettings({...bulkAssignSettings, assignTo: e.target.value})}
                      placeholder="Employee name or department"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Department</label>
                      <Select value={bulkAssignSettings.department} onValueChange={(value) => 
                        setBulkAssignSettings({...bulkAssignSettings, department: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">System</label>
                      <Select value={bulkAssignSettings.system} onValueChange={(value) => 
                        setBulkAssignSettings({...bulkAssignSettings, system: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                          <SelectItem value="Genesys Cloud">Genesys Cloud</SelectItem>
                          <SelectItem value="Skype">Skype</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea 
                      value={bulkAssignSettings.notes}
                      onChange={(e) => setBulkAssignSettings({...bulkAssignSettings, notes: e.target.value})}
                      placeholder="Optional notes for this assignment"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsBulkAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => startBulkAssign(['1', '2', '3'])}>
                      Assign Numbers
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransformDialogOpen} onOpenChange={setIsTransformDialogOpen}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <RefreshCw className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Transform</h3>
                    <p className="text-sm text-gray-500">Format conversion</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transform Phone Number Formats</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">From Format</label>
                      <Select value={transformSettings.fromFormat} onValueChange={(value) =>
                        setTransformSettings({...transformSettings, fromFormat: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="e164">E.164 (+1XXXXXXXXXX)</SelectItem>
                          <SelectItem value="10digit">10-digit (XXXXXXXXXX)</SelectItem>
                          <SelectItem value="dashed">Dashed (XXX-XXX-XXXX)</SelectItem>
                          <SelectItem value="dotted">Dotted (XXX.XXX.XXXX)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">To Format</label>
                      <Select value={transformSettings.toFormat} onValueChange={(value) =>
                        setTransformSettings({...transformSettings, toFormat: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="e164">E.164 (+1XXXXXXXXXX)</SelectItem>
                          <SelectItem value="10digit">10-digit (XXXXXXXXXX)</SelectItem>
                          <SelectItem value="dashed">Dashed (XXX-XXX-XXXX)</SelectItem>
                          <SelectItem value="dotted">Dotted (XXX.XXX.XXXX)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={transformSettings.addExtensions}
                        onChange={(e) => setTransformSettings({...transformSettings, addExtensions: e.target.checked})}
                      />
                      <span className="text-sm">Generate extensions automatically</span>
                    </label>
                    {transformSettings.addExtensions && (
                      <Select value={transformSettings.extensionPattern} onValueChange={(value) =>
                        setTransformSettings({...transformSettings, extensionPattern: value})}>
                        <SelectTrigger className="ml-6 w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last4">Last 4 digits</SelectItem>
                          <SelectItem value="last5">Last 5 digits</SelectItem>
                          <SelectItem value="sequential">Sequential (0001, 0002...)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsTransformDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={startTransformation} disabled={isTransforming}>
                      {isTransforming ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Transforming...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Start Transformation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Operations History */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operations.map((operation) => (
                  <div key={operation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(operation.status)}
                        <div>
                          <h4 className="font-medium">{operation.details}</h4>
                          <p className="text-sm text-gray-500">
                            Started {new Date(operation.startTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusBadge(operation.status)}>
                        {operation.status}
                      </Badge>
                    </div>

                    {operation.status === 'running' && (
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{operation.progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={operation.progress} className="h-2" />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-medium">{operation.totalItems}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Processed:</span>
                        <span className="ml-1 font-medium text-green-600">{operation.processedItems}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Failed:</span>
                        <span className="ml-1 font-medium text-red-600">{operation.failedItems}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">Phone Numbers</h4>
                    <p className="text-sm text-gray-500">Import individual numbers with details</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportTemplate('import')}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium">Number Ranges</h4>
                    <p className="text-sm text-gray-500">Import entire number ranges</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportTemplate('ranges')}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" onClick={exportAllNumbers}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export All Numbers
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={exportAllNumbers}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export Available Numbers
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={exportAllNumbers}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export Assigned Numbers
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={exportAllNumbers}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export by Department
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Number Format Transformation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">From Format</label>
                  <Select value={transformSettings.fromFormat} onValueChange={(value) => 
                    setTransformSettings({...transformSettings, fromFormat: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="e164">E.164 (+1XXXXXXXXXX)</SelectItem>
                      <SelectItem value="10digit">10-digit (XXXXXXXXXX)</SelectItem>
                      <SelectItem value="dashed">Dashed (XXX-XXX-XXXX)</SelectItem>
                      <SelectItem value="dotted">Dotted (XXX.XXX.XXXX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">To Format</label>
                  <Select value={transformSettings.toFormat} onValueChange={(value) => 
                    setTransformSettings({...transformSettings, toFormat: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="e164">E.164 (+1XXXXXXXXXX)</SelectItem>
                      <SelectItem value="10digit">10-digit (XXXXXXXXXX)</SelectItem>
                      <SelectItem value="dashed">Dashed (XXX-XXX-XXXX)</SelectItem>
                      <SelectItem value="dotted">Dotted (XXX.XXX.XXXX)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={transformSettings.addExtensions}
                    onChange={(e) => setTransformSettings({...transformSettings, addExtensions: e.target.checked})}
                  />
                  <span className="text-sm">Generate extensions automatically</span>
                </label>
                {transformSettings.addExtensions && (
                  <Select value={transformSettings.extensionPattern} onValueChange={(value) => 
                    setTransformSettings({...transformSettings, extensionPattern: value})}>
                    <SelectTrigger className="ml-6 w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last4">Last 4 digits</SelectItem>
                      <SelectItem value="last5">Last 5 digits</SelectItem>
                      <SelectItem value="sequential">Sequential (0001, 0002...)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button onClick={startTransformation} disabled={isTransforming}>
                {isTransforming ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Transforming...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Transformation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};