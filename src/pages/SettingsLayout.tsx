import React from 'react';
import { Outlet } from 'react-router-dom';

const SettingsLayout = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <nav className="space-y-1">
              <a
                href="/settings/sync"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                Sync Management
              </a>
              <a
                href="/settings/api"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                API Tokens
              </a>
              <a
                href="/settings/tags"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                Tag Management
              </a>
              <a
                href="/settings/webhooks"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                Webhook Management
              </a>
              {/* Add other settings links here */}
            </nav>
          </aside>
          <main className="lg:col-span-3">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
