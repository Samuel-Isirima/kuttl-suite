import { DashboardLayout } from "@/components/dashboard-layout";
import { Plus, Search, Filter, Settings, Globe } from "lucide-react";
import { Input } from "../components/ui/input";
import { customizationsApi, websitesApi } from "../lib/api";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface Customization {
  id: string;
  user_id: string;
  website_url: string;
  user_request: string;
  change_description: string;
  element_targeted: string;
  modification_type: string;
  status: string;
  applied_at: string | null;
  created_at: string;
  prompt_id?: string;
  snapshot_id?: string;
}

interface CustomizationStats {
  total_changes: number;
  success_rate: number;
  pending_changes: number;
  avg_apply_time: number;
}


const statusColors: Record<string, string> = {
  Applied: "bg-green-100 text-green-800",
  Testing: "bg-yellow-100 text-yellow-800",
  Pending: "bg-gray-100 text-gray-800",
  Failed: "bg-red-100 text-red-800",
};

export default function Customizations() {
  const [customizations, setCustomizations] = useState<Customization[]>([]);
  const [stats, setStats] = useState<CustomizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [websites, setWebsites] = useState<Array<{id: string, name: string, url: string}>>([]);

  useEffect(() => {
    fetchCustomizations();
    fetchStats();
  }, [statusFilter]);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchCustomizations = async () => {
    try {
      setLoading(true);
      const data = await customizationsApi.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50
      });
      setCustomizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch customizations:', error);
      toast.error('Failed to load customizations');
      setCustomizations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await customizationsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchWebsites = async () => {
    try {
      const response = await websitesApi.list();
      console.log('Fetched websites for customizations:', response);
      const data = response?.data || response;
      const websitesArray = Array.isArray(data) ? data.map(w => ({ id: w.id, name: w.name, url: w.url })) : [];
      console.log('Mapped websites:', websitesArray);
      setWebsites(websitesArray);
    } catch (error: any) {
      console.error('Failed to fetch websites:', error);
      setWebsites([]);
    }
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Not applied';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const filteredCustomizations = (Array.isArray(customizations) ? customizations : []).filter(custom => {
    const matchesSearch = custom.user_request.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custom.website_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      custom.change_description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesWebsite = websiteFilter === "all" || 
      websites.some(w => w.id === websiteFilter && w.url === custom.website_url);
    
    return matchesSearch && matchesWebsite;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Website Customizations</h1>
            <p className="text-sm text-gray-500">Track user-requested changes and modifications applied to their websites</p>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Apply New Change</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.total_changes || 0}</div>
            <div className="text-sm text-gray-500">Total Changes Applied</div>
            <div className="text-xs text-green-500 mt-1">+15 this week</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.success_rate?.toFixed(1) || '0.0'}%</div>
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-xs text-green-500 mt-1">+2.1% improvement</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.pending_changes || 0}</div>
            <div className="text-sm text-gray-500">Pending Changes</div>
            <div className="text-xs text-yellow-500 mt-1">Awaiting approval</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.avg_apply_time?.toFixed(1) || '0.0'}s</div>
            <div className="text-sm text-gray-500">Avg Apply Time</div>
            <div className="text-xs text-green-500 mt-1">-0.6s faster</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search customizations..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Applied">Applied</option>
            <option value="Testing">Testing</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
          <select 
            className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={websiteFilter}
            onChange={(e) => setWebsiteFilter(e.target.value)}
          >
            <option value="all">All Websites</option>
            {Array.isArray(websites) && websites.map((website) => (
              <option key={website.id} value={website.id}>
                {website.name}
              </option>
            ))}
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Customizations Table */}
        <div className="bg-white rounded-lg border border-gray-200  overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Element Targeted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">Loading customizations...</div>
                    </td>
                  </tr>
                ) : filteredCustomizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-500">No customizations found</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {customizations.length === 0 ? "No data available" : "No results match your search"}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomizations.map((custom) => (
                  <tr key={custom.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-3 flex-shrink-0">
                          <Settings className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-600 italic">"${custom.user_request}"</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        {custom.change_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{custom.website_url}</div>
                      <div className="text-xs text-gray-500">Website</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {custom.element_targeted}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-800">
                        {custom.modification_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[custom.status]}`}>
                        {custom.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(custom.applied_at)}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredCustomizations.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredCustomizations.length > 0 ? 1 : 0} to {Math.min(filteredCustomizations.length, 50)} of {filteredCustomizations.length} website changes
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
        )}
      </div>
    </DashboardLayout>
  );
}