import { DashboardLayout } from "~/components/dashboard-layout";
import { Plus, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { apiKeysApi } from "~/lib/api";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  name: string;
  token_prefix: string;
  last_used?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

interface CreateKeyForm {
  name: string;
  expires_at: string;
}

export default function APIKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateKeyForm>({ name: "", expires_at: "" });
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  // Load API keys
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const keys = await apiKeysApi.list();
      setApiKeys(keys);
    } catch (error: any) {
      toast.error("Failed to load API keys");
      console.error("Load keys error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name.trim()) {
      toast.error("Please provide a name for the API key");
      return;
    }

    try {
      const response = await apiKeysApi.create({
        name: createForm.name,
        expires_at: createForm.expires_at || undefined
      });
      
      setCreatedToken(response.token);
      setCreateForm({ name: "", expires_at: "" });
      toast.success("API key created successfully!");
      
      // Reload keys
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Failed to create API key");
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiKeysApi.revoke(keyId);
      toast.success("API key revoked successfully");
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <p className="text-sm text-gray-500">
              Manage API keys for accessing the Kuttl API
            </p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Key</span>
          </button>
        </div>

        {/* API Keys List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your API Keys</h2>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : apiKeys.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No API keys yet. Create your first key to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <div key={key.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {key.name}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          key.is_active 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {key.is_active ? "Active" : "Revoked"}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span>Key: {key.token_prefix}...</span>
                        <span>Created: {formatDate(key.created_at)}</span>
                        {key.last_used && (
                          <span>Last used: {formatTimeAgo(key.last_used)}</span>
                        )}
                        {key.expires_at && (
                          <span>Expires: {formatDate(key.expires_at)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(key.token_prefix)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy key prefix"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      {key.is_active && (
                        <button
                          onClick={() => handleRevokeKey(key.id, key.name)}
                          className="text-red-400 hover:text-red-600"
                          title="Revoke key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New API Key
                </h3>
                
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="e.g., Production API, Mobile App"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={createForm.expires_at}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      Create Key
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Created Token Modal */}
        {createdToken && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  API Key Created
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Your new API key has been created. Copy it now - you won't be able to see it again!
                  </p>
                  
                  <div className="bg-gray-50 p-3 rounded border">
                    <code className="text-sm font-mono break-all">{createdToken}</code>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => copyToClipboard(createdToken)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                  >
                    Copy Key
                  </button>
                  <button
                    onClick={() => {
                      setCreatedToken(null);
                      setShowCreateModal(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Done
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