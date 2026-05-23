import { DashboardLayout } from "@/components/dashboard-layout";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const usageData = [
  { name: 'Mon', requests: 12400, errors: 23 },
  { name: 'Tue', requests: 15600, errors: 18 },
  { name: 'Wed', requests: 18200, errors: 31 },
  { name: 'Thu', requests: 14800, errors: 15 },
  { name: 'Fri', requests: 22100, errors: 42 },
  { name: 'Sat', requests: 19500, errors: 28 },
  { name: 'Sun', requests: 16300, errors: 19 },
];

const hourlyData = [
  { hour: '00', requests: 1200 },
  { hour: '04', requests: 800 },
  { hour: '08', requests: 2400 },
  { hour: '12', requests: 3200 },
  { hour: '16', requests: 2800 },
  { hour: '20', requests: 1800 },
];

const endpoints = [
  { name: '/api/ui-layer/get', requests: '234,567', avgResponse: '45ms', errorRate: '0.2%', status: 'Healthy' },
  { name: '/api/ui-layer/update', requests: '98,432', avgResponse: '128ms', errorRate: '1.1%', status: 'Warning' },
  { name: '/api/customization/create', requests: '76,543', avgResponse: '89ms', errorRate: '0.5%', status: 'Healthy' },
  { name: '/api/customization/render', requests: '456,789', avgResponse: '67ms', errorRate: '0.8%', status: 'Healthy' },
  { name: '/api/account/validate', requests: '123,456', avgResponse: '234ms', errorRate: '2.3%', status: 'Critical' },
];

const recentActivity = [
  { time: '2 minutes ago', account: 'Acme Corp', action: 'Rendered header customization', status: 'success', requests: 145 },
  { time: '5 minutes ago', account: 'TechStart Inc', action: 'Updated theme layer', status: 'success', requests: 78 },
  { time: '8 minutes ago', account: 'BuildCo Ltd', action: 'API rate limit exceeded', status: 'error', requests: 0 },
  { time: '12 minutes ago', account: 'Design Studio', action: 'Created new button variant', status: 'success', requests: 23 },
  { time: '15 minutes ago', account: 'StartupXYZ', action: 'Fetched mobile layout', status: 'success', requests: 156 },
];

export default function APIUsage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Usage</h1>
            <p className="text-sm text-gray-500">Monitor API performance and track usage patterns</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              Export Report
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600">
              View Logs
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">847,283</div>
                <div className="text-sm text-gray-500">Total Requests</div>
                <div className="text-xs text-green-500 mt-1">+34% vs last week</div>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">156ms</div>
                <div className="text-sm text-gray-500">Avg Response Time</div>
                <div className="text-xs text-green-500 mt-1">-12ms improvement</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">99.7%</div>
                <div className="text-sm text-gray-500">Uptime</div>
                <div className="text-xs text-green-500 mt-1">+0.2% this month</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">0.9%</div>
                <div className="text-sm text-gray-500">Error Rate</div>
                <div className="text-xs text-yellow-500 mt-1">+0.3% vs yesterday</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Over Time */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Volume</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Area type="monotone" dataKey="requests" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRequests)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hourly Pattern */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Usage Pattern</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Bar dataKey="requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Endpoint Performance */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Endpoint Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {endpoints.map((endpoint, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{endpoint.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {endpoint.requests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {endpoint.avgResponse}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {endpoint.errorRate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        endpoint.status === 'Healthy' ? 'bg-green-100 text-green-800' :
                        endpoint.status === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {endpoint.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.account}</span> {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    {activity.requests > 0 && (
                      <p className="text-xs text-gray-500">Generated {activity.requests} requests</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}