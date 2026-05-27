import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardApi } from "../lib/api";

interface DashboardMetrics {
  total_websites: number;
  total_snapshots: number;
  total_api_requests: number;
  total_customizations: number;
  snapshots_this_month: number;
  api_requests_this_month: number;
  customizations_this_month: number;
  last_calculated_at: string;
}

export function MetricsGrid() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const formatNumber = (num: number | undefined | null) => {
    if (num == null || num === undefined || isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const calculateChange = (current: number | undefined | null, monthly: number | undefined | null) => {
    if (current == null || monthly == null || current === 0) return '+0%';
    const percentage = ((monthly / Math.max(current - monthly, 1)) * 100);
    return `+${percentage.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
        <p className="text-gray-500">Failed to load metrics</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
      {/* Total Websites Card */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm md:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">
            Total Websites
          </h3>
          <select className="text-xs bg-transparent border-none text-gray-500 focus:outline-none">
            <option>This month</option>
          </select>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.total_websites)}</div>
          <div className="text-sm text-gray-500">Tracked websites</div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">Total snapshots: {formatNumber(metrics.total_snapshots)}</div>
          <div className="text-sm text-gray-500 mb-2">This month: {formatNumber(metrics.snapshots_this_month)}</div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* API Requests Card */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">
            API Requests
          </h3>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.total_api_requests)}</div>
          <div className="flex items-center text-sm text-gray-500">
            <span>vs last month</span>
            <span className="ml-2 text-green-500 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {calculateChange(metrics.total_api_requests, metrics.api_requests_this_month)}
            </span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="h-12 flex items-end space-x-1">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 bg-blue-500 rounded-sm",
                i === 6 ? "h-8" : i === 7 ? "h-10" : i === 8 ? "h-12" : "h-4"
              )}
            />
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          This month: {formatNumber(metrics.api_requests_this_month)}
        </div>
      </div>

      {/* UI Customizations Card */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">
            UI Customizations
          </h3>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.total_customizations)}</div>
          <div className="flex items-center text-sm text-gray-500">
            <span>vs last month</span>
            <span className="ml-2 text-green-500 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              {calculateChange(metrics.total_customizations, metrics.customizations_this_month)}
            </span>
          </div>
        </div>

        {/* Circular progress */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            <path
              d="M18 2.0845 A 15.9155 15.9155 0 0 1 18 33.9155"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray={`${Math.min(((metrics.customizations_this_month || 0) / Math.max((metrics.total_customizations || 0), 1)) * 100, 100)}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">
              {Math.min(((metrics.customizations_this_month || 0) / Math.max((metrics.total_customizations || 0), 1)) * 100, 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          This month: {formatNumber(metrics.customizations_this_month)}
        </div>
      </div>
    </div>
  );
}