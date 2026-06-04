import { useState, useEffect } from "react";
import { DashboardLayout } from "../components/dashboard-layout";
import { AuthWrapper } from "../components/auth-wrapper";
import { api, websitesApi } from "../lib/api";
import { toast } from "sonner";
import { Activity, Globe, Clock, Smartphone, Monitor, Tablet, Filter, Calendar, Eye } from "lucide-react";

interface APICall {
  id: string;
  api_key_name: string;
  ip_address: string;
  domain: string;
  referrer: string;
  action: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  user_agent: string;
  device_type: string;
  browser_fingerprint: string;
  timestamp: string;
}

interface UsageStats {
  total_calls: number;
  calls_today: number;
  calls_this_week: number;
  calls_this_month: number;
  avg_response_time: number;
  success_rate: number;
}

export default function Usage() {
  const [apiCalls, setApiCalls] = useState<APICall[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTimeRange, setFilterTimeRange] = useState<string>("7d");
  const [filterWebsite, setFilterWebsite] = useState<string>("all");
  const [websites, setWebsites] = useState<Array<{id: string, name: string, url: string}>>([]);

  useEffect(() => {
    fetchUsageData();
  }, [filterAction, filterTimeRange, filterWebsite]);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchUsageData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterAction !== "all") params.set("action", filterAction);
      if (filterTimeRange !== "all") params.set("timeRange", filterTimeRange);
      if (filterWebsite !== "all") {
        const selectedWebsite = websites.find(w => w.id === filterWebsite);
        if (selectedWebsite) params.set("domain", selectedWebsite.url);
      }

      const [callsResponse, statsResponse] = await Promise.all([
        api.get(`usage/calls?${params}`).json<{ success: boolean; data: APICall[] } | APICall[]>(),
        api.get(`usage/stats?${params}`).json<{ success: boolean; data: UsageStats } | UsageStats>()
      ]);

      // Handle both wrapped and unwrapped responses
      const calls = Array.isArray(callsResponse) ? callsResponse : ('data' in callsResponse ? callsResponse.data : []);
      const stats = 'data' in statsResponse ? statsResponse.data : statsResponse;

      setApiCalls(calls);
      setStats(stats);
    } catch (error: any) {
      console.error('Failed to fetch usage data:', error);
      
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      toast.error("Failed to load usage data");
      setApiCalls([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebsites = async () => {
    try {
      const data = await websitesApi.list();
      setWebsites(Array.isArray(data) ? data.map(w => ({ id: w.id, name: w.name, url: w.url })) : []);
    } catch (error: any) {
      console.error('Failed to fetch websites:', error);
      setWebsites([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return "text-green-600 bg-green-100";
    if (statusCode >= 400 && statusCode < 500) return "text-yellow-600 bg-yellow-100";
    if (statusCode >= 500) return "text-red-600 bg-red-100";
    return "text-gray-600 bg-gray-100";
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      case 'desktop': 
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'snapshot': return "text-purple-600 bg-purple-100";
      case 'customization': return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };


  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Usage</h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor and analyze your API usage patterns and performance
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.total_calls.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Calls</div>
                <div className="text-xs text-gray-500 mt-1">All time</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.calls_today.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Today</div>
                <div className="text-xs text-green-500 mt-1">+{Math.round((stats.calls_today / Math.max(stats.calls_this_week - stats.calls_today, 1)) * 100)}% vs yesterday</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.calls_this_week.toLocaleString()}</div>
                <div className="text-sm text-gray-500">This Week</div>
                <div className="text-xs text-gray-500 mt-1">Last 7 days</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.calls_this_month.toLocaleString()}</div>
                <div className="text-sm text-gray-500">This Month</div>
                <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.avg_response_time}ms</div>
                <div className="text-sm text-gray-500">Avg Response</div>
                <div className="text-xs text-gray-500 mt-1">Performance</div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-900">{stats.success_rate}%</div>
                <div className="text-sm text-gray-500">Success Rate</div>
                <div className="text-xs text-green-500 mt-1">2xx responses</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Action:</label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  <option value="snapshot">Snapshot</option>
                  <option value="customization">Customization</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Time Range:</label>
                <select
                  value={filterTimeRange}
                  onChange={(e) => setFilterTimeRange(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1d">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* API Calls List */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent API Calls</h3>
            </div>

            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                      <div className="w-20 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : apiCalls.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No API calls found</p>
                <p className="text-sm mt-1">Try adjusting your filters or make some API calls to see data here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action & Endpoint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Fingerprint
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiCalls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionColor(call.action)}`}>
                                {call.action}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {call.method} {call.endpoint}
                              </div>
                              <div className="text-xs text-gray-500">
                                API Key: {call.api_key_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span>{call.domain || call.ip_address}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {getDeviceIcon(call.device_type)}
                              <span className="text-xs text-gray-500">{call.device_type}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {call.browser_fingerprint ? call.browser_fingerprint.substring(0, 8) : 'N/A'}
                            </code>
                            {call.browser_fingerprint && (
                              <div className="text-xs text-gray-500 mt-1">
                                Full: {call.browser_fingerprint}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(call.status_code)}`}>
                            {call.status_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{call.response_time_ms}ms</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{formatDate(call.timestamp)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded-md">
                              <Eye className="w-3 h-3 mr-1" />
                              API Call
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>

    </AuthWrapper>
  );
}