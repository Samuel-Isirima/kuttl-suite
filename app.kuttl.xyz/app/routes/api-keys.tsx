import { DashboardLayout } from "@/components/dashboard-layout";
import { Plus, Search, Filter, MoreVertical, Copy, Eye, EyeOff, Trash2, RotateCcw } from "lucide-react";
import { useState } from "react";

const apiKeys = [
  {
    id: 1,
    name: "Production API Key",
    key: "kuttl_live_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
    status: "Active",
    permissions: ["read", "write", "admin"],
    usage: "12,450",
    lastUsed: "2 hours ago",
    created: "2024-01-15",
    environment: "production"
  },
  {
    id: 2,
    name: "Development Key",
    key: "kuttl_test_9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k",
    status: "Active",
    permissions: ["read", "write"],
    usage: "3,240",
    lastUsed: "1 day ago",
    created: "2024-02-20",
    environment: "development"
  },
  {
    id: 3,
    name: "Mobile App Integration",
    key: "kuttl_live_5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u",
    status: "Active",
    permissions: ["read"],
    usage: "890",
    lastUsed: "5 minutes ago",
    created: "2024-03-10",
    environment: "production"
  },
  {
    id: 4,
    name: "Legacy Integration",
    key: "kuttl_test_1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k",
    status: "Revoked",
    permissions: ["read"],
    usage: "0",
    lastUsed: "2 weeks ago",
    created: "2023-12-05",
    environment: "production"
  }
];

const permissionColors: Record<string, string> = {
  read: "bg-blue-100 text-blue-800",
  write: "bg-green-100 text-green-800", 
  admin: "bg-purple-100 text-purple-800"
};

const statusColors: Record<string, string> = {
  Active: "bg-green-100 text-green-800",
  Revoked: "bg-red-100 text-red-800",
  Expired: "bg-yellow-100 text-yellow-800"
};

export default function APIKeys() {
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  const toggleKeyVisibility = (keyId: number) => {
    const newVisibleKeys = new Set(visibleKeys);
    if (newVisibleKeys.has(keyId)) {
      newVisibleKeys.delete(keyId);
    } else {
      newVisibleKeys.add(keyId);
    }
    setVisibleKeys(newVisibleKeys);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, you'd show a toast notification here
  };

  const maskKey = (key: string) => {
    const prefix = key.substring(0, 12);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${"*".repeat(24)}${suffix}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <p className="text-sm text-gray-500">Manage API keys for accessing your UI customization platform</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create API Key</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">4</div>
            <div className="text-sm text-gray-500">Total Keys</div>
            <div className="text-xs text-green-500 mt-1">1 added this month</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">3</div>
            <div className="text-sm text-gray-500">Active Keys</div>
            <div className="text-xs text-gray-500 mt-1">1 revoked</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">16,580</div>
            <div className="text-sm text-gray-500">Total Requests</div>
            <div className="text-xs text-green-500 mt-1">+8% this week</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">99.9%</div>
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-xs text-green-500 mt-1">No failed requests</div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Security Reminder</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Keep your API keys secure and never expose them in client-side code. Rotate keys regularly and revoke unused keys.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search API keys..."
              className="pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Environments</option>
            <option>Production</option>
            <option>Development</option>
          </select>
          <select className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Active</option>
            <option>Revoked</option>
            <option>Expired</option>
          </select>
        </div>

        {/* API Keys Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">{apiKey.name}</div>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                          </code>
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="text-gray-400 hover:text-blue-600 p-1"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Created: {apiKey.created}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        apiKey.environment === "production" 
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {apiKey.environment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {apiKey.permissions.map((permission) => (
                          <span
                            key={permission}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${permissionColors[permission]}`}
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apiKey.usage} requests
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {apiKey.lastUsed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[apiKey.status]}`}>
                        {apiKey.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center space-x-2">
                        <button className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-gray-100">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        {apiKey.status === "Active" && (
                          <button className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-gray-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Create New API Key
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Production Mobile App"
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                          <select className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>Production</option>
                            <option>Development</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input type="checkbox" className="rounded text-blue-600 mr-2" defaultChecked />
                              <span className="text-sm text-gray-700">Read access</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="rounded text-blue-600 mr-2" />
                              <span className="text-sm text-gray-700">Write access</span>
                            </label>
                            <label className="flex items-center">
                              <input type="checkbox" className="rounded text-blue-600 mr-2" />
                              <span className="text-sm text-gray-700">Admin access</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Key
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}