import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, X, ArrowRight } from 'lucide-react';

interface CSVColumn {
  index: number;
  name: string;
  sample: string;
  mappedTo: string | null;
  confidence: number;
}

interface ParsedCSV {
  headers: string[];
  data: string[][];
  totalRows: number;
}

interface ColumnMapping {
  [key: string]: string;
}

const DATABASE_COLUMNS = [
  { key: 'number', label: 'Phone Number', aliases: ['phone', 'telephone', 'number', 'phoneNumber', 'phone_number', 'tel'] },
  { key: 'extension', label: 'Extension', aliases: ['ext', 'extension', 'extn', 'x'] },
  { key: 'assignedTo', label: 'Assigned To', aliases: ['assigned', 'assignedTo', 'assigned_to', 'user', 'owner', 'employee'] },
  { key: 'department', label: 'Department', aliases: ['dept', 'department', 'division', 'team', 'group'] },
  { key: 'location', label: 'Location', aliases: ['location', 'site', 'office', 'building', 'city'] },
  { key: 'carrier', label: 'Carrier', aliases: ['carrier', 'provider', 'vendor', 'telco'] },
  { key: 'system', label: 'System', aliases: ['system', 'pbx', 'platform', 'service'] },
  { key: 'status', label: 'Status', aliases: ['status', 'state', 'condition'] },
  { key: 'notes', label: 'Notes', aliases: ['notes', 'comments', 'description', 'remarks'] },
  { key: 'dateAssigned', label: 'Date Assigned', aliases: ['dateAssigned', 'date_assigned', 'assigned_date', 'assignedDate'] },
  { key: 'lastUsed', label: 'Last Used', aliases: ['lastUsed', 'last_used', 'lastActivity', 'last_activity'] }
];

export const IntelligentCSVParser: React.FC<{
  onDataParsed: (data: any[], mapping: ColumnMapping) => void;
  onClose: () => void;
}> = ({ onDataParsed, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCSV = useCallback((csvText: string): ParsedCSV => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    );
    
    return {
      headers,
      data,
      totalRows: data.length
    };
  }, []);

  const calculateColumnConfidence = useCallback((columnName: string, sampleData: string): { mappedTo: string | null, confidence: number } => {
    const normalizedColumnName = columnName.toLowerCase().replace(/[_\s-]/g, '');
    
    let bestMatch: string | null = null;
    let highestConfidence = 0;

    DATABASE_COLUMNS.forEach(dbCol => {
      dbCol.aliases.forEach(alias => {
        const normalizedAlias = alias.toLowerCase().replace(/[_\s-]/g, '');
        
        // Exact match
        if (normalizedColumnName === normalizedAlias) {
          if (95 > highestConfidence) {
            bestMatch = dbCol.key;
            highestConfidence = 95;
          }
        }
        // Partial match
        else if (normalizedColumnName.includes(normalizedAlias) || normalizedAlias.includes(normalizedColumnName)) {
          const confidence = Math.max(60, 80 - Math.abs(normalizedColumnName.length - normalizedAlias.length) * 5);
          if (confidence > highestConfidence) {
            bestMatch = dbCol.key;
            highestConfidence = confidence;
          }
        }
      });

      // Content-based detection for phone numbers
      if (dbCol.key === 'number' && sampleData) {
        const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/;
        if (phoneRegex.test(sampleData)) {
          if (85 > highestConfidence) {
            bestMatch = dbCol.key;
            highestConfidence = 85;
          }
        }
      }

      // Content-based detection for extensions
      if (dbCol.key === 'extension' && sampleData) {
        const extRegex = /^\d{3,6}$/;
        if (extRegex.test(sampleData)) {
          if (75 > highestConfidence) {
            bestMatch = dbCol.key;
            highestConfidence = 75;
          }
        }
      }
    });

    return { mappedTo: bestMatch, confidence: highestConfidence };
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      const text = await uploadedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);

      // Auto-detect column mappings
      const detectedColumns: CSVColumn[] = parsed.headers.map((header, index) => {
        const sampleData = parsed.data[0]?.[index] || '';
        const { mappedTo, confidence } = calculateColumnConfidence(header, sampleData);
        
        return {
          index,
          name: header,
          sample: sampleData,
          mappedTo,
          confidence
        };
      });

      setColumns(detectedColumns);

      // Create initial mapping
      const initialMapping: ColumnMapping = {};
      detectedColumns.forEach(col => {
        if (col.mappedTo && col.confidence > 50) {
          initialMapping[col.mappedTo] = col.name;
        }
      });
      setMapping(initialMapping);

      setStep('mapping');
    } catch (error) {
      console.error('Error parsing CSV:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [parseCSV, calculateColumnConfidence]);

  const handleMappingChange = (dbColumn: string, csvColumn: string | null) => {
    const newMapping = { ...mapping };
    
    // Remove any existing mapping to this CSV column
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === csvColumn) {
        delete newMapping[key];
      }
    });

    // Add new mapping if csvColumn is not null
    if (csvColumn) {
      newMapping[dbColumn] = csvColumn;
    } else {
      delete newMapping[dbColumn];
    }

    setMapping(newMapping);
  };

  const handleImport = () => {
    if (!parsedData) return;

    const mappedData = parsedData.data.map(row => {
      const mappedRow: any = {};
      
      Object.entries(mapping).forEach(([dbColumn, csvColumn]) => {
        const columnIndex = parsedData.headers.indexOf(csvColumn);
        if (columnIndex !== -1) {
          mappedRow[dbColumn] = row[columnIndex] || '';
        }
      });

      return mappedRow;
    });

    onDataParsed(mappedData, mapping);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <X className="w-4 h-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="ms-card w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="ms-card-header flex justify-between items-center">
          <div>
            <h2 className="ms-title-2">Intelligent CSV Import</h2>
            <p className="ms-subtitle mt-1">Import CSV files from any system with automatic column mapping</p>
          </div>
          <button onClick={onClose} className="ms-button-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="ms-card-content overflow-y-auto">
          {step === 'upload' && (
            <div className="text-center py-12">
              <div className="mb-6">
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="ms-title-3 mb-2">Upload CSV File</h3>
                <p className="ms-subtitle">Select a CSV file from any system. We'll automatically detect and map the columns.</p>
              </div>
              
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="ms-button ms-button-primary cursor-pointer">
                <FileText className="w-4 h-4 mr-2" />
                Choose CSV File
              </label>

              {isProcessing && (
                <div className="mt-6">
                  <div className="ms-progress">
                    <div className="ms-progress-bar" style={{ width: '100%' }}></div>
                  </div>
                  <p className="ms-subtitle mt-2">Processing file...</p>
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && parsedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="ms-title-3">Column Mapping</h3>
                  <p className="ms-subtitle">Review and adjust the automatic column mappings</p>
                </div>
                <div className="text-sm text-gray-600">
                  {parsedData.totalRows.toLocaleString()} rows detected
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CSV Columns */}
                <div className="ms-card">
                  <div className="ms-card-header">
                    <h4 className="ms-title-3">CSV Columns ({columns.length})</h4>
                  </div>
                  <div className="ms-card-content space-y-2 max-h-96 overflow-y-auto">
                    {columns.map((column) => (
                      <div key={column.index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{column.name}</div>
                          <div className="text-sm text-gray-600 truncate">{column.sample}</div>
                        </div>
                        {column.mappedTo && (
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${getConfidenceColor(column.confidence)}`}>
                            {getConfidenceIcon(column.confidence)}
                            <span>{column.confidence}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Database Columns */}
                <div className="ms-card">
                  <div className="ms-card-header">
                    <h4 className="ms-title-3">Database Fields</h4>
                  </div>
                  <div className="ms-card-content space-y-2 max-h-96 overflow-y-auto">
                    {DATABASE_COLUMNS.map((dbCol) => (
                      <div key={dbCol.key} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{dbCol.label}</div>
                          {mapping[dbCol.key] && (
                            <div className="flex items-center text-green-600">
                              <ArrowRight className="w-4 h-4 mr-1" />
                              <span className="text-sm">Mapped</span>
                            </div>
                          )}
                        </div>
                        <select
                          value={mapping[dbCol.key] || ''}
                          onChange={(e) => handleMappingChange(dbCol.key, e.target.value || null)}
                          className="ms-input w-full text-sm"
                        >
                          <option value="">-- Not Mapped --</option>
                          {columns.map((col) => (
                            <option key={col.index} value={col.name}>
                              {col.name} ({col.sample ? `"${col.sample.substring(0, 20)}..."` : 'empty'})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setStep('upload')} className="ms-button ms-button-secondary">
                  Back
                </button>
                <div className="space-x-2">
                  <button onClick={() => setStep('preview')} className="ms-button ms-button-secondary">
                    Preview
                  </button>
                  <button onClick={handleImport} className="ms-button ms-button-primary">
                    Import Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="ms-title-3">Import Preview</h3>
                  <p className="ms-subtitle">Preview of mapped data (first 10 rows)</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="ms-table">
                  <thead>
                    <tr>
                      {Object.keys(mapping).map((dbColumn) => (
                        <th key={dbColumn}>
                          {DATABASE_COLUMNS.find(col => col.key === dbColumn)?.label || dbColumn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.data.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {Object.entries(mapping).map(([dbColumn, csvColumn]) => {
                          const columnIndex = parsedData.headers.indexOf(csvColumn);
                          return (
                            <td key={dbColumn}>
                              {columnIndex !== -1 ? row[columnIndex] || '-' : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button onClick={() => setStep('mapping')} className="ms-button ms-button-secondary">
                  Back to Mapping
                </button>
                <button onClick={handleImport} className="ms-button ms-button-primary">
                  Import {parsedData.totalRows.toLocaleString()} Records
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};