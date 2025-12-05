import React, { useState, useEffect } from 'react';
import {
  Home,
  BarChart3,
  Upload,
  Users,
  FileText,
  TrendingUp,
  Database,
  RefreshCw,
  MapPin,
  Settings,
  Phone,
  MessageSquare,
  Server,
  PieChart
} from 'lucide-react';
import { dataService } from '../services/dataService';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export const MicrosoftSidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'utilization', label: 'Utilization', icon: PieChart },
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
        { id: 'sync', label: 'System Sync', icon: Database },
        { id: 'skype', label: 'Skype for Business', icon: MessageSquare },
        { id: 'webhooks', label: 'Webhooks', icon: RefreshCw },
        { id: 'webhook-log', label: 'Webhook Log', icon: FileText },
        { id: 'uc-admin', label: 'UC Admin Tools', icon: Server },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  // Statistics for dashboard - load from real data
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
    <div className="ms-nav w-64 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="ms-title-3 text-gray-900">NumberPro</h1>
            <p className="ms-subtitle">Enterprise Edition</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuSections.map((section, sectionIndex) => (
          <div key={section.title} className="ms-nav-section">
            <div className="ms-nav-section-title">
              {section.title}
            </div>
            <div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`ms-nav-item w-full ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Quick Stats Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs space-y-2">
          <div className="ms-nav-section-title mb-2">Quick Stats</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-white rounded border">
              <div className="font-semibold text-blue-600">{stats.total.toLocaleString()}</div>
              <div className="text-gray-600 text-xs">Total</div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="font-semibold text-green-600">{stats.available.toLocaleString()}</div>
              <div className="text-gray-600 text-xs">Available</div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="font-semibold text-blue-500">{stats.assigned.toLocaleString()}</div>
              <div className="text-gray-600 text-xs">Assigned</div>
            </div>
            <div className="text-center p-2 bg-white rounded border">
              <div className="font-semibold text-orange-600">{stats.aging.toLocaleString()}</div>
              <div className="text-gray-600 text-xs">Aging</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};