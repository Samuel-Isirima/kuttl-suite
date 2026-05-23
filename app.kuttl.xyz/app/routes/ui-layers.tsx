import { DashboardLayout } from "@/components/dashboard-layout";
import { Plus, Search, Filter, MoreVertical, Eye, Code, Download } from "lucide-react";

const uiLayers = [
  {
    id: 1,
    name: "Header Component",
    description: "Navigation header with logo and menu items",
    version: "v2.1.0",
    type: "Component",
    status: "Active",
    usageCount: 234,
    lastModified: "2 days ago",
    account: "Acme Corp"
  },
  {
    id: 2,
    name: "Dark Theme",
    description: "Complete dark mode styling for all components",
    version: "v1.5.2",
    type: "Theme",
    status: "Active",
    usageCount: 156,
    lastModified: "1 week ago",
    account: "TechStart Inc"
  },
  {
    id: 3,
    name: "Button Variants",
    description: "Custom button styles with hover animations",
    version: "v3.0.1",
    type: "Component",
    status: "Draft",
    usageCount: 89,
    lastModified: "3 hours ago",
    account: "Design Studio"
  },
  {
    id: 4,
    name: "Mobile Layout",
    description: "Responsive layout adjustments for mobile devices",
    version: "v1.8.0",
    type: "Layout",
    status: "Active",
    usageCount: 312,
    lastModified: "5 days ago",
    account: "BuildCo Ltd"
  },
  {
    id: 5,
    name: "Form Elements",
    description: "Styled input fields, checkboxes, and form controls",
    version: "v2.3.1",
    type: "Component",
    status: "Active",
    usageCount: 167,
    lastModified: "1 day ago",
    account: "StartupXYZ"
  }
];

const typeColors: Record<string, string> = {
  Component: "bg-blue-100 text-blue-800",
  Theme: "bg-purple-100 text-purple-800",
  Layout: "bg-green-100 text-green-800",
};

export default function UILayers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">UI Layers</h1>
            <p className="text-sm text-gray-500">Manage reusable UI components and themes</p>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Layer</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">28</div>
            <div className="text-sm text-gray-500">Total Layers</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">958</div>
            <div className="text-sm text-gray-500">Total Usage</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">12</div>
            <div className="text-sm text-gray-500">Components</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">8</div>
            <div className="text-sm text-gray-500">Themes</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search UI layers..."
              className="pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Types</option>
            <option>Component</option>
            <option>Theme</option>
            <option>Layout</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* UI Layers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uiLayers.map((layer) => (
            <div key={layer.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{layer.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeColors[layer.type] || 'bg-gray-100 text-gray-800'}`}>
                        {layer.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{layer.description}</p>
                    <div className="text-xs text-gray-400">
                      Version {layer.version} • {layer.account}
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{layer.usageCount} uses</span>
                    <span>•</span>
                    <span>{layer.lastModified}</span>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    layer.status === "Active" 
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {layer.status}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                  <button className="flex items-center justify-center p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                    <Code className="w-4 h-4" />
                  </button>
                  <button className="flex items-center justify-center p-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing 1 to 5 of 28 UI layers
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
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}