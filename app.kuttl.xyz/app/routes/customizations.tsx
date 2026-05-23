import { DashboardLayout } from "@/components/dashboard-layout";
import { Plus, Search, Filter, MoreVertical, Settings, Eye, Copy } from "lucide-react";

const customizations = [
  {
    id: 1,
    name: "E-commerce Header",
    description: "Custom header with shopping cart integration",
    account: "Acme Corp",
    layer: "Header Component",
    status: "Live",
    requests: "2,341",
    lastUsed: "5 minutes ago",
    created: "2024-04-10",
    performance: "98.5%"
  },
  {
    id: 2,
    name: "Dark Mode Blog",
    description: "Blog layout with dark theme customizations",
    account: "TechStart Inc",
    layer: "Dark Theme",
    status: "Live",
    requests: "1,876",
    lastUsed: "2 hours ago",
    created: "2024-03-22",
    performance: "97.2%"
  },
  {
    id: 3,
    name: "Mobile Dashboard",
    description: "Responsive dashboard for mobile app",
    account: "BuildCo Ltd",
    layer: "Mobile Layout",
    status: "Testing",
    requests: "156",
    lastUsed: "1 day ago",
    created: "2024-04-15",
    performance: "94.8%"
  },
  {
    id: 4,
    name: "Contact Form Styling",
    description: "Branded contact form with validation",
    account: "Design Studio",
    layer: "Form Elements",
    status: "Draft",
    requests: "0",
    lastUsed: "Never",
    created: "2024-04-18",
    performance: "-"
  },
  {
    id: 5,
    name: "Premium Button Set",
    description: "Animated buttons for premium features",
    account: "StartupXYZ",
    layer: "Button Variants",
    status: "Live",
    requests: "3,102",
    lastUsed: "30 minutes ago",
    created: "2024-02-28",
    performance: "99.1%"
  }
];

const statusColors: Record<string, string> = {
  Live: "bg-green-100 text-green-800",
  Testing: "bg-yellow-100 text-yellow-800",
  Draft: "bg-gray-100 text-gray-800",
};

export default function Customizations() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customizations</h1>
            <p className="text-sm text-gray-500">Monitor active UI customizations and their performance</p>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Customization</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">42</div>
            <div className="text-sm text-gray-500">Active Customizations</div>
            <div className="text-xs text-green-500 mt-1">+8 this week</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">847K</div>
            <div className="text-sm text-gray-500">Total Requests</div>
            <div className="text-xs text-green-500 mt-1">+12% vs last month</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">97.8%</div>
            <div className="text-sm text-gray-500">Avg Performance</div>
            <div className="text-xs text-green-500 mt-1">+0.3% improvement</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">156ms</div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
            <div className="text-xs text-green-500 mt-1">-12ms faster</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customizations..."
              className="pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Live</option>
            <option>Testing</option>
            <option>Draft</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Customizations Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customizations.map((custom) => (
                  <tr key={custom.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center mr-4 flex-shrink-0">
                          <Settings className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{custom.name}</div>
                          <div className="text-sm text-gray-500">{custom.description}</div>
                          <div className="text-xs text-gray-400">Based on: {custom.layer}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {custom.account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[custom.status]}`}>
                        {custom.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {custom.requests}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          custom.performance === '-' ? 'text-gray-400' : 
                          parseFloat(custom.performance) >= 98 ? 'text-green-600' : 
                          parseFloat(custom.performance) >= 95 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {custom.performance}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {custom.lastUsed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-100">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-100">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing 1 to 5 of 42 customizations
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-2 text-sm font-medium text-white bg-blue-500 border border-blue-500 rounded-md">
              1
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              2
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              3
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}