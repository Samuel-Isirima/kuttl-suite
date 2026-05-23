import { Search, Bell, Plus, Filter, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  onMenuClick?: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center space-x-4">
        <button 
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Manage your UI customization platform and accounts
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 lg:space-x-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            className="pl-10 pr-4 py-2 w-48 lg:w-64 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Mobile search button */}
        <button className="sm:hidden p-2 text-gray-400 hover:text-gray-500">
          <Search className="h-6 w-6" />
        </button>

        {/* User avatars */}
        <div className="hidden sm:flex items-center -space-x-2">
          <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-sm font-medium">
            A
          </div>
          <div className="h-8 w-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-sm font-medium">
            B
          </div>
          <div className="h-8 w-8 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white text-sm font-medium">
            C
          </div>
          <button className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 hover:bg-gray-300">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-500">
          <Bell className="h-6 w-6" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Export button */}
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-1 lg:space-x-2">
          <span className="hidden sm:inline">Export</span>
          <span className="bg-blue-600 px-1.5 lg:px-2 py-1 rounded text-xs">📊</span>
        </button>
      </div>
    </div>
  );
}