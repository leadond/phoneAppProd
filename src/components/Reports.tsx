import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, Printer, Mail, Share2, Clock, CheckCircle, Building, Users, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dataService } from '../services/dataService';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'utilization' | 'inventory' | 'assignments' | 'audit' | 'compliance';
  icon: any;
  frequency: string;
  lastGenerated?: string;
  status: 'active' | 'scheduled' | 'draft';
}

interface ScheduledReport {
  id: string;
  template: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: string;
  recipients: string[];
  status: 'active' | 'paused';
}

export const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [dateRange, setDateRange] = useState('30d');
  const [format, setFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>({});
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'utilization',
      name: 'Number Utilization Report',
      description: 'Detailed analysis of number usage across departments and projects',
      type: 'utilization',
      icon: Phone,
      frequency: 'Weekly',
      lastGenerated: '2024-01-28',
      status: 'active'
    },
    {
      id: 'inventory',
      name: 'Number Inventory Report',
      description: 'Complete inventory of all phone numbers with current status',
      type: 'inventory',
      icon: FileText,
      frequency: 'Monthly',
      lastGenerated: '2024-01-25',
      status: 'active'
    },
    {
      id: 'assignments',
      name: 'Assignment Activity Report',
      description: 'Summary of number assignments and releases by department',
      type: 'assignments',
      icon: Users,
      frequency: 'Weekly',
      status: 'active'
    },
    {
      id: 'audit',
      name: 'System Audit Report',
      description: 'Comprehensive audit trail of all system activities',
      type: 'audit',
      icon: CheckCircle,
      frequency: 'Monthly',
      lastGenerated: '2024-01-20',
      status: 'active'
    },
    {
      id: 'compliance',
      name: 'Compliance Report',
      description: 'Regulatory compliance and number management policies',
      type: 'compliance',
      icon: Building,
      frequency: 'Quarterly',
      status: 'scheduled'
    }
  ];

  const scheduledReports: ScheduledReport[] = [
    {
      id: '1',
      template: 'Number Utilization Report',
      frequency: 'weekly',
      nextRun: '2024-02-05 09:00',
      recipients: ['admin@company.com', 'manager@company.com'],
      status: 'active'
    },
    {
      id: '2',
      template: 'Number Inventory Report',
      frequency: 'monthly',
      nextRun: '2024-02-01 08:00',
      recipients: ['admin@company.com'],
      status: 'active'
    }
  ];

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const [stats, numbers, audit] = await Promise.all([
          dataService.getStatistics(),
          dataService.getPhoneNumbers(),
          dataService.getAuditLog()
        ]);
        
        setStatistics(stats);
        setPhoneNumbers(numbers);
        setAuditLog(audit);
      } catch (error) {
        console.error('Failed to load report data:', error);
      }
    };

    loadReportData();
  }, []);

  const generateReport = async (reportId: string) => {
    setLoading(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would call an API to generate and download the report
      console.log(`Generating ${reportId} report in ${format} format for ${dateRange} period`);
      
      // Simulate file download
      const link = document.createElement('a');
      link.href = '#';
      link.download = `${reportId}_report_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      paused: 'bg-yellow-100 text-yellow-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Generate and manage formal reports for phone number management</p>
        </div>
        <Button>
          <Share2 className="w-4 h-4 mr-2" />
          Report Settings
        </Button>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Report Generation Options */}
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="date-range">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="format">Export Format</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="xlsx">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV Data</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={() => selectedReport && generateReport(selectedReport)}
                    disabled={!selectedReport || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Report Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </div>
                      </div>
                      <Badge className={getStatusBadge(template.status)}>
                        {template.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">{template.description}</p>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Frequency:</span>
                      <span className="font-medium">{template.frequency}</span>
                    </div>
                    
                    {template.lastGenerated && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Last Generated:</span>
                        <span className="font-medium">{formatDate(template.lastGenerated)}</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setSelectedReport(template.id)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Select
                      </Button>
                      <Button size="sm" variant="outline">
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          {/* Scheduled Reports */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Scheduled Reports</CardTitle>
                <Button>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule New Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{report.template}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>Frequency: {report.frequency}</span>
                        <span>Next run: {report.nextRun}</span>
                        <span>Recipients: {report.recipients.length}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusBadge(report.status)}>
                        {report.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats for Scheduled Reports */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Schedules</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {scheduledReports.filter(r => r.status === 'active').length}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Reports This Month</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
                  </div>
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Recipients</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {[...new Set(scheduledReports.flatMap(r => r.recipients))].length}
                    </p>
                  </div>
                  <Mail className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Report History */}
          <Card>
            <CardHeader>
              <CardTitle>Report Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    name: 'Number Utilization Report',
                    generated: '2024-01-28 10:30 AM',
                    format: 'PDF',
                    size: '2.3 MB',
                    status: 'completed'
                  },
                  {
                    name: 'Number Inventory Report',
                    generated: '2024-01-25 09:15 AM',
                    format: 'Excel',
                    size: '1.8 MB',
                    status: 'completed'
                  },
                  {
                    name: 'System Audit Report',
                    generated: '2024-01-20 08:00 AM',
                    format: 'PDF',
                    size: '4.1 MB',
                    status: 'completed'
                  }
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{report.name}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{report.generated}</span>
                        <span>{report.format}</span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-800">
                        {report.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Summary Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">28</div>
                  <div className="text-sm text-gray-500">Reports Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">100%</div>
                  <div className="text-sm text-gray-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">45.2 MB</div>
                  <div className="text-sm text-gray-500">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">1.6 MB</div>
                  <div className="text-sm text-gray-500">Avg Size</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};