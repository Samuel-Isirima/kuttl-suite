import { DashboardLayout } from "@/components/dashboard-layout";
import { Plus, Search, Globe, Copy, Trash2, ExternalLink } from "lucide-react";
import { Input } from "../components/ui/input";
import { websitesApi } from "../lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Website {
  id: string;
  user_id: string;
  name: string;
  url: string;
  description?: string;
  hash_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_request_at?: string;
  total_requests: number;
}

interface CreateWebsiteData {
  name: string;
  url: string;
  description?: string;
}

export default function Websites() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebsite, setNewWebsite] = useState<CreateWebsiteData>({
    name: "",
    url: "",
    description: ""
  });
  const [websiteToDelete, setWebsiteToDelete] = useState<Website | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Debug auth state
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    console.log('Auth token exists:', !!token);
    console.log('User data exists:', !!user);
    
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const response = await websitesApi.list();
      console.log('Fetched websites data:', response);
      // Handle case where API returns {data: Array, success: true}
      const data = response?.data || response;
      const websitesArray = Array.isArray(data) ? data : [];
      console.log('Setting websites state to:', websitesArray);
      setWebsites(websitesArray);
    } catch (error) {
      console.error('Failed to fetch websites:', error);
      toast.error('Failed to load websites');
      setWebsites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await websitesApi.create(newWebsite);
      console.log('Created website:', result);
      await fetchWebsites();
      setShowCreateModal(false);
      setNewWebsite({ name: "", url: "", description: "" });
      toast.success('Website created successfully');
    } catch (error) {
      console.error('Failed to create website:', error);
      toast.error('Failed to create website');
    }
  };

  const copyHashKey = (hashKey: string) => {
    navigator.clipboard.writeText(hashKey);
    toast.success('Hash key copied to clipboard');
  };

  const copyJSSnippet = (hashKey: string) => {
    const snippet = `<script src="https://app.kuttl.xyz/kuttl.js" data-website="${hashKey}"></script>`;
    navigator.clipboard.writeText(snippet);
    toast.success('JavaScript snippet copied to clipboard');
  };

  const handleDeleteConfirm = async () => {
    if (!websiteToDelete) return;
    setDeleting(true);
    try {
      await websitesApi.delete(websiteToDelete.id);
      setWebsites(prev => prev.filter(w => w.id !== websiteToDelete.id));
      toast.success(`"${websiteToDelete.name}" deleted`);
      setWebsiteToDelete(null);
    } catch (error) {
      toast.error('Failed to delete website');
    } finally {
      setDeleting(false);
    }
  };

  const truncateHashKey = (hashKey: string, maxLength: number = 20) => {
    if (hashKey.length <= maxLength) return hashKey;
    const start = hashKey.substring(0, Math.floor(maxLength / 2) - 2);
    const end = hashKey.substring(hashKey.length - Math.floor(maxLength / 2) + 2);
    return `${start}...${end}`;
  };

  const filteredWebsites = (Array.isArray(websites) ? websites : []).filter(website =>
    website.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    website.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (website.description && website.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  console.log('Websites state:', websites);
  console.log('Filtered websites:', filteredWebsites);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Websites</h1>
            <p className="text-sm text-gray-500">Manage your websites and their tracking keys</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search websites..."
              icon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Websites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded w-8"></div>
                </div>
              </div>
            ))
          ) : filteredWebsites.length === 0 ? (
            <div className="col-span-full">
              <div className="text-center py-12">
                <Globe className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No websites</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {websites.length === 0 
                    ? "Get started by adding your first website" 
                    : "No websites match your search"}
                </p>
                {websites.length === 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Website
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            filteredWebsites.map((website) => (
              <div key={website.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{website.name}</h3>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {website.url}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                    {website.description && (
                      <p className="text-sm text-gray-600 mt-2">{website.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setWebsiteToDelete(website)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete website"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Hash Key */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website Key</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded font-mono" title={website.hash_key}>
                        {truncateHashKey(website.hash_key)}
                      </code>
                      <button
                        onClick={() => copyHashKey(website.hash_key)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Copy hash key"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{website.total_requests} requests</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      website.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {website.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyJSSnippet(website.hash_key)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Copy JS Snippet
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Website Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 transition-opacity" 
                aria-hidden="true"
                onClick={() => setShowCreateModal(false)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
                <form onSubmit={handleCreateWebsite}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                          Add New Website
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Website Name *
                            </label>
                            <input
                              type="text"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="My Awesome Website"
                              value={newWebsite.name}
                              onChange={(e) => setNewWebsite({...newWebsite, name: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Website URL *
                            </label>
                            <input
                              type="url"
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://mywebsite.com"
                              value={newWebsite.url}
                              onChange={(e) => setNewWebsite({...newWebsite, url: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description (optional)
                            </label>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              placeholder="Brief description of your website"
                              value={newWebsite.description}
                              onChange={(e) => setNewWebsite({...newWebsite, description: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Create Website
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {websiteToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 transition-opacity"
                aria-hidden="true"
                onClick={() => !deleting && setWebsiteToDelete(null)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full relative z-10">
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Delete website</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-semibold text-gray-800">"{websiteToDelete.name}"</span>? This will permanently remove the website and its hash key. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                  <button
                    onClick={() => setWebsiteToDelete(null)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
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