import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Phone, Users, DollarSign, Clock, Download, Calendar, Filter, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { dataService } from '../services/dataService';

export const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('utilization');
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState([
    {
      title: 'Total Numbers',
      value: '0',
      change: '+0%',
      trend: 'up' as const,
      icon: Phone,
      color: 'text-blue-600'
    },
    {
      title: 'Utilization Rate',
      value: '0%',
      change: '+0%',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Active Ranges',
      value: '0',
      change: '+0%',
      trend: 'up' as const,
      icon: MapPin,
      color: 'text-purple-600'
    },
    {
      title: 'Aging Numbers',
      value: '0',
      change: '+0%',
      trend: 'down' as const,
      icon: Clock,
      color: 'text-orange-600'
    }
  ]);

  const [utilizationData, setUtilizationData] = useState<any[]>([]);
  const [utilizationTrendData, setUtilizationTrendData] = useState<any[]>([]);
  const [carrierDistribution, setCarrierDistribution] = useState<any[]>([]);
  const [agingAnalysis, setAgingAnalysis] = useState<any[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [topProjects, setTopProjects] = useState<any[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true);
        const [statistics, phoneNumbers, numberRanges, auditLog] = await Promise.all([
          dataService.getStatistics(),
          dataService.getPhoneNumbers(),
          dataService.getNumberRanges(),
          dataService.getAuditLog()
        ]);

        // Update KPI data with improved calculations
        const utilizationRate = statistics.totalNumbers > 0
          ? ((statistics.assignedNumbers / statistics.totalNumbers) * 100).toFixed(1)
          : '0';

        setKpiData([
          {
            title: 'Total Numbers',
            value: statistics.totalNumbers.toLocaleString(),
            change: '+0%', // TODO: Calculate from historical data
            trend: 'up' as const,
            icon: Phone,
            color: 'text-blue-600'
          },
          {
            title: 'Utilization Rate',
            value: `${utilizationRate}%`,
            change: '+0%',
            trend: parseFloat(utilizationRate) > 50 ? 'up' as const : 'down' as const,
            icon: TrendingUp,
            color: 'text-green-600'
          },
          {
            title: 'Active Ranges',
            value: statistics.totalRanges.toString(),
            change: '+0%',
            trend: 'up' as const,
            icon: MapPin,
            color: 'text-purple-600'
          },
          {
            title: 'Aging Numbers',
            value: statistics.agingNumbers.toString(),
            change: '+0%',
            trend: 'down' as const,
            icon: Clock,
            color: 'text-orange-600'
          }
        ]);

        // Generate department utilization data
        const departments = [...new Set(phoneNumbers.map(n => n.department))];
        const deptUtilization = departments.map(dept => {
          const deptNumbers = phoneNumbers.filter(n => n.department === dept);
          return {
            name: dept,
            assigned: deptNumbers.filter(n => n.status === 'assigned').length,
            available: deptNumbers.filter(n => n.status === 'available').length,
            reserved: deptNumbers.filter(n => n.status === 'reserved').length,
            total: deptNumbers.length
          };
        }).filter(d => d.total > 0);

        setUtilizationData(deptUtilization);

        // Generate carrier distribution
        const carriers = [...new Set(phoneNumbers.map(n => n.carrier))];
        const carrierData = carriers.map(carrier => {
          const count = phoneNumbers.filter(n => n.carrier === carrier).length;
          const percentage = statistics.totalNumbers > 0 ? Math.round((count / statistics.totalNumbers) * 100) : 0;
          return {
            name: carrier,
            value: percentage,
            percentage
          };
        }).filter(c => c.value > 0);

        setCarrierDistribution(carrierData);

        // Generate aging analysis
        const agingRanges = [
          { range: '0-7 days', min: 0, max: 7 },
          { range: '8-30 days', min: 8, max: 30 },
          { range: '31-60 days', min: 31, max: 60 },
          { range: '60+ days', min: 61, max: Infinity }
        ];

        const agingData = agingRanges.map(ageRange => {
          const count = phoneNumbers.filter(n =>
            n.agingDays >= ageRange.min && n.agingDays <= ageRange.max
          ).length;
          const percentage = statistics.totalNumbers > 0 ? Math.round((count / statistics.totalNumbers) * 100) : 0;
          return {
            range: ageRange.range,
            count,
            percentage
          };
        });

        setAgingAnalysis(agingData);

        // Generate project data
        const projects = [...new Set(phoneNumbers.filter(n => n.project).map(n => n.project))];
        const projectData = projects.map(project => {
          const projectNumbers = phoneNumbers.filter(n => n.project === project);
          const assigned = projectNumbers.filter(n => n.status === 'assigned').length;
          const utilization = projectNumbers.length > 0 ? ((assigned / projectNumbers.length) * 100).toFixed(1) : '0.0';
          
          return {
            name: project,
            numbers: projectNumbers.length,
            utilization: parseFloat(utilization),
            status: projectNumbers.some(n => n.status === 'assigned') ? 'active' : 'pending'
          };
        });

        setTopProjects(projectData);

        // Generate recent alerts from audit log
        const alerts = auditLog.slice(0, 4).map(entry => ({
          type: entry.type === 'import' ? 'success' : entry.type === 'assignment' ? 'info' : 'warning',
          message: entry.action,
          time: getRelativeTime(entry.timestamp)
        }));

        setRecentAlerts(alerts.length > 0 ? alerts : [
          { type: 'info', message: 'System ready for data upload', time: 'Ready' }
        ]);

        // Set empty data for charts that need historical data
        setUtilizationTrendData([]);
        setUsageMetrics([]);

      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, []);

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
            <p className="text-gray-500 mt-1">Loading analytics data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reporting</h1>
          <p className="text-gray-500 mt-1">Comprehensive insights into number management and usage</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{kpi.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                    <div className="flex items-center mt-1">
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100`}>
                    <Icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Utilization */}
        <Card>
          <CardHeader>
            <CardTitle>Department Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="assigned" stackId="a" fill="#10B981" name="Assigned" />
                <Bar dataKey="reserved" stackId="a" fill="#F59E0B" name="Reserved" />
                <Bar dataKey="available" stackId="a" fill="#3B82F6" name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Carrier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Carrier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={carrierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {carrierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Utilization Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {utilizationTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={utilizationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [name === 'utilization' ? `${value}%` : value, name === 'utilization' ? 'Utilization Rate' : 'Number Count']} />
                  <Area type="monotone" dataKey="utilization" stackId="1" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Historical trend data will appear here</p>
                  <p className="text-sm">Data collection in progress</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alert.type === 'warning' ? 'bg-yellow-500' :
                    alert.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Call Volume Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="inbound" stroke="#10B981" strokeWidth={2} name="Inbound" />
                <Line type="monotone" dataKey="outbound" stroke="#3B82F6" strokeWidth={2} name="Outbound" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Aging Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Number Aging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agingAnalysis.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded bg-blue-500" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-sm font-medium">{item.range}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: COLORS[index]
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Project Name</th>
                  <th className="text-left py-2">Numbers</th>
                  <th className="text-left py-2">Utilization</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((project, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 font-medium">{project.name}</td>
                    <td className="py-3">{project.numbers}</td>
                    <td className="py-3">{project.utilization}%</td>
                    <td className="py-3">
                      <Badge className={
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {project.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};