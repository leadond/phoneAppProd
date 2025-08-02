
import React, { useState, useEffect } from 'react';
import {
  Phone,
  BarChart3,
  Upload,
  Users,
  FileText,
  Home,
  Settings,
  TrendingUp,
  Database,
  RefreshCw,
  MapPin,
  Clock,
  Shield
} from 'lucide-react';
import { dataService } from '../services/dataService';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
      ]
    },
    {
      title: 'Number Management',
      items: [
        { id: 'numbers', label: 'Phone Numbers', icon: Phone },
        { id: 'ranges', label: 'Number Ranges', icon: MapPin },
        { id: 'bulk', label: 'Data Management', icon: Database },
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'audit', label: 'Audit Log', icon: FileText },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'sync', label: 'PBX Sync', icon: Database },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  // Statistics for sidebar - load from real data
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    aging: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const statistics = await dataService.getStatistics();
        setStats({
          total: statistics.totalNumbers,
          available: statistics.availableNumbers,
          assigned: statistics.assignedNumbers,
          aging: statistics.agingNumbers
        });
      } catch (error) {
        console.error('Failed to load sidebar statistics:', error);
        // Keep stats at 0 if there's an error
      }
    };

    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white w-64 shadow-lg border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">NumberPro</h1>
        <p className="text-sm text-gray-500">Enterprise Edition</p>
      </div>
      
      <nav className="mt-6">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? 'mt-8' : ''}>
            <div className="px-6 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            </div>
            <div className="mt-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Quick Stats Footer */}
      <div className="mt-auto p-6 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Total Numbers:</span>
            <span className="font-medium text-gray-900">{stats.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Available:</span>
            <span className="font-medium text-green-600">{stats.available.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Assigned:</span>
            <span className="font-medium text-blue-600">{stats.assigned.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Aging:</span>
            <span className="font-medium text-orange-600">{stats.aging.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
