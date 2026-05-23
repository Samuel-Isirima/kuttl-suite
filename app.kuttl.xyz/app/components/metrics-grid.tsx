import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
  {
    title: "Total Accounts",
    value: "1,247",
    subtitle: "Active accounts",
    change: "+12%",
    positive: true,
    dropdown: "This month",
    tags: ["Free Plan", "Premium"]
  },
  {
    title: "API Requests",
    value: "847,283",
    subtitle: "vs last month",
    change: "+34%",
    positive: true,
    chart: true
  },
  {
    title: "UI Customizations",
    value: "3,456",
    subtitle: "vs last month",
    change: "+18%",
    positive: true,
    chart: true,
    circular: true
  }
];

export function MetricsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
      {/* Total Accounts Card */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm md:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">
            Total Accounts
          </h3>
          <select className="text-xs bg-transparent border-none text-gray-500 focus:outline-none">
            <option>This month</option>
          </select>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">1,247</div>
          <div className="text-sm text-gray-500">Active accounts</div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-gray-600 mb-2">Plan distribution</div>
          <div className="text-sm text-gray-500 mb-2">New accounts: 43</div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full">
              Free Plan
            </span>
            <span className="px-3 py-1 bg-blue-400 text-white text-xs rounded-full">
              Premium
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
          <div className="text-2xl font-bold text-gray-900">847,283</div>
          <div className="flex items-center text-sm text-gray-500">
            <span>vs last month</span>
            <span className="ml-2 text-green-500 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +34%
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

        <button className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center">
          See Details →
        </button>
      </div>

      {/* UI Customizations Card */}
      <div className="bg-white p-4 lg:p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500">
            UI Customizations
          </h3>
        </div>
        
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900">3,456</div>
          <div className="flex items-center text-sm text-gray-500">
            <span>vs last month</span>
            <span className="ml-2 text-green-500 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              +18%
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
              strokeDasharray="75, 100"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">75%</span>
          </div>
        </div>

        <button className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center">
          See Details →
        </button>
      </div>
    </div>
  );
}