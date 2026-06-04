import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Filter } from 'lucide-react';
import { dashboardApi } from '../lib/api';

interface AnalyticsData {
  name: string;
  value: number;
  requests: number;
  month: string;
}

interface UsageData {
  name: string;
  value: number;
  color: string;
}

interface CustomizationsByPlan {
  total: number;
  growth: number;
  premium: {
    count: number;
    percentage: number;
  };
  free: {
    count: number;
    percentage: number;
  };
}

export function ChartsSection() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [customizationsByPlan, setCustomizationsByPlan] = useState<CustomizationsByPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analytics, usage, planData] = await Promise.all([
          dashboardApi.getAnalyticsData().catch(() => []),
          dashboardApi.getUsageData().catch(() => []),
          dashboardApi.getCustomizationsByPlan().catch(() => null)
        ]);

        setAnalyticsData(Array.isArray(analytics) ? analytics : []);
        setUsageData(Array.isArray(usage) ? usage : [
          { name: 'Active Usage', value: 73.2, color: '#3b82f6' },
          { name: 'Idle', value: 26.8, color: '#e5e7eb' }
        ]);
        setCustomizationsByPlan(planData);
      } catch (error) {
        console.error('Failed to fetch charts data:', error);
        // Set fallback data
        setAnalyticsData([
          { name: 'JAN', value: 12.5, requests: 45000, month: '01' },
          { name: 'FEB', value: 15.2, requests: 52000, month: '02' },
          { name: 'MAR', value: 18.8, requests: 64000, month: '03' },
          { name: 'APR', value: 22.1, requests: 78000, month: '04' },
          { name: 'MAY', value: 28.2, requests: 95000, month: '05' },
          { name: 'JUN', value: 31.8, requests: 110000, month: '06' },
          { name: 'JUL', value: 35.5, requests: 125000, month: '07' },
          { name: 'AUG', value: 42.3, requests: 145000, month: '08' },
        ]);
        setUsageData([
          { name: 'Active Usage', value: 73.2, color: '#3b82f6' },
          { name: 'Idle', value: 26.8, color: '#e5e7eb' }
        ]);
        setCustomizationsByPlan({
          total: 3456,
          growth: 18,
          premium: { count: 2340, percentage: 68 },
          free: { count: 1116, percentage: 32 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const latestGrowth = analyticsData.length > 0 ? analyticsData[analyticsData.length - 1]?.value || 0 : 0;
  const monthlyGrowth = analyticsData.length > 1 ? 
    ((analyticsData[analyticsData.length - 1]?.requests || 0) - (analyticsData[analyticsData.length - 2]?.requests || 0)) / Math.max((analyticsData[analyticsData.length - 2]?.requests || 1), 1) * 100 : 0;
  const activeUsagePercentage = usageData.find(d => d.name === 'Active Usage')?.value || 73.2;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* API Usage Growth Chart */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 ">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              API Usage Growth
            </h3>
            <div className="flex items-baseline space-x-2">
              {analyticsData.length > 0 ? (
                <>
                  <span className="text-2xl font-bold text-gray-900">
                    {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500">Growth</span>
                  <span className={`text-sm ${monthlyGrowth > 0 ? 'text-green-500' : monthlyGrowth < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-900">0%</span>
                  <span className="text-sm text-gray-500">No growth data</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select className="text-xs bg-transparent border-none text-gray-500 focus:outline-none">
              <option>This year</option>
            </select>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Filter className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="h-48 lg:h-64">
          {analyticsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  domain={[0, 'dataMax']}
                />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorValue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <p className="text-sm">No data available</p>
                <p className="text-xs mt-1">Start making API requests to see analytics</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <div className="text-sm text-gray-500">
            {analyticsData.length > 0 ? `${analyticsData.length} months of data` : 'No data'}
          </div>
        </div>
      </div>


      {/* UI Customizations by Account Type */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 ">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              UI Customizations
            </h3>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(customizationsByPlan?.total || 0)}</div>
              <div className="text-sm text-gray-500">Total customizations</div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">⋯</button>
        </div>

        {customizationsByPlan && customizationsByPlan.total > 0 ? (
          <>
            {/* Plan breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Premium</span>
                <span>{formatNumber(customizationsByPlan.premium?.count || 0)} customizations</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${customizationsByPlan.premium?.percentage || 0}%` }}></div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Free</span>
                <span>{formatNumber(customizationsByPlan.free?.count || 0)} customizations</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${customizationsByPlan.free?.percentage || 0}%` }}></div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-24 text-gray-400">
            <div className="text-center">
              <p className="text-sm">No customizations yet</p>
              <p className="text-xs mt-1">Start customizing your websites</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}