import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Filter } from 'lucide-react';

const analyticsData = [
  { name: 'JAN', value: 12.5, requests: 45000 },
  { name: 'FEB', value: 15.2, requests: 52000 },
  { name: 'MAR', value: 18.8, requests: 64000 },
  { name: 'APR', value: 22.1, requests: 78000 },
  { name: 'MAY', value: 28.2, requests: 95000 },
  { name: 'JUN', value: 31.8, requests: 110000 },
  { name: 'JUL', value: 35.5, requests: 125000 },
  { name: 'AUG', value: 42.3, requests: 145000 },
];

const usageData = [
  { name: 'Active Usage', value: 73.2, color: '#3b82f6' },
  { name: 'Idle', value: 26.8, color: '#e5e7eb' },
];

export function ChartsSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      {/* API Usage Growth Chart */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              API Usage Growth
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">+42.3%</span>
              <span className="text-sm text-gray-500">Growth</span>
              <span className="text-sm text-green-500">+12.8%</span>
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
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorValue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-center">
          <div className="text-sm text-green-500">+28%</div>
        </div>
      </div>

      {/* Platform Performance Chart */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-gray-500">
            Platform Performance
          </h3>
        </div>

        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">73.2%</div>
          <div className="text-sm text-gray-500">Active usage</div>
        </div>

        {/* Pie Chart */}
        <div className="h-24 lg:h-32 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={usageData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                startAngle={90}
                endAngle={450}
                dataKey="value"
                stroke="none"
              >
                {usageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-600">Active API usage</span>
            </div>
            <span className="font-medium text-gray-900">Daily average</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded mr-2"></div>
              <span className="text-gray-600">Idle time</span>
            </div>
            <span className="font-medium text-gray-900">Per account</span>
          </div>
        </div>

        <button className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center">
          See Details →
        </button>
      </div>

      {/* UI Customizations by Account Type */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">
              UI Customizations by Plan
            </h3>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">3,456</div>
              <div className="text-sm text-green-500">+18%</div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">⋯</button>
        </div>

        {/* Plan breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Premium</span>
            <span>2,340 customizations</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '68%' }}></div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Free</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-400 h-2 rounded-full" style={{ width: '32%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}