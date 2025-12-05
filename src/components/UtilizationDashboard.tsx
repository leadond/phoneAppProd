import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dataService } from '../services/dataService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const UtilizationDashboard = () => {
  const [utilizationData, setUtilizationData] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // This is a placeholder for actual data fetching and processing
    const data = await dataService.getStatistics();
    const utilization = [
      { name: 'Assigned', value: data.assignedNumbers },
      { name: 'Available', value: data.availableNumbers },
      { name: 'Reserved', value: data.reservedNumbers },
      { name: 'Aging', value: data.agingNumbers },
    ];
    setUtilizationData(utilization);

    const distribution = [
      { name: 'Assigned', value: data.assignedNumbers },
      { name: 'Available', value: data.availableNumbers },
      { name: 'Reserved', value: data.reservedNumbers },
    ];
    setStatusDistribution(distribution);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Number Utilization by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {statusDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default UtilizationDashboard;
