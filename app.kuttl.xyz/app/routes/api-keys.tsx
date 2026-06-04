import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { DashboardLayout } from "../components/dashboard-layout";
import { AuthWrapper } from "../components/auth-wrapper";
import { apiKeysApi } from "../lib/api";
import { toast } from "sonner";
import { Copy, Trash2, Key, Plus, Eye, EyeOff, Shield } from "lucide-react";
import { Input } from "../components/ui/input";

interface APIToken {
  id: string;
  name: string;
  token_prefix: string;
  last_used: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NewAPIToken {
  id: string;
  name: string;
  token: string;
  token_prefix: string;
  created_at: string;
}

export default function APIKeys() {
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<NewAPIToken | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [tokenToDisable, setTokenToDisable] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    expires_at: ""
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      // Debug: Check if user is logged in
      const token = localStorage.getItem('auth_token');
      console.log('DEBUG: Auth token exists:', !!token);
      if (token) {
        console.log('DEBUG: Token prefix:', token.substring(0, 20) + '...');
      }
      
      const data = await apiKeysApi.list();
      setTokens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch API tokens:', error);
      
      // Check if it's an auth error
      if (error.response && error.response.status === 401) {
        console.log('DEBUG: 401 Unauthorized - redirecting to login');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      toast.error("Failed to load API tokens");
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Token name is required");
      return;
    }

    // Validate expiration date if provided
    if (formData.expires_at) {
      const expiryDate = new Date(formData.expires_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today
      
      if (expiryDate <= today) {
        toast.error("Expiration date must be in the future");
        return;
      }
    }

    setCreating(true);
    try {
      const tokenData: { name: string; expires_at?: string } = {
        name: formData.name.trim()
      };
      
      if (formData.expires_at) {
        // Convert date to RFC3339 format for Go backend
        const expiryDate = new Date(formData.expires_at + "T00:00:00Z");
        if (!isNaN(expiryDate.getTime())) {
          tokenData.expires_at = expiryDate.toISOString();
        }
      }

      const newTokenData = await apiKeysApi.create(tokenData);
      setNewToken(newTokenData);
      setFormData({ name: "", expires_at: "" });
      // Keep modal open to show the token
      toast.success("API token created successfully!");
      await fetchTokens(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to create API token:', error);
      toast.error(error.message || "Failed to create API token");
    } finally {
      setCreating(false);
    }
  };

  const handleDisableClick = (tokenId: string, tokenName: string) => {
    setTokenToDisable({ id: tokenId, name: tokenName });
    setShowDisableModal(true);
  };

  const handleDisableConfirm = async () => {
    if (!tokenToDisable) return;

    try {
      await apiKeysApi.revoke(tokenToDisable.id);
      toast.success("API token disabled successfully");
      await fetchTokens(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to disable API token:', error);
      toast.error(error.message || "Failed to disable API token");
    } finally {
      setShowDisableModal(false);
      setTokenToDisable(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const activeTokens = tokens.filter(token => token.is_active && !isExpired(token.expires_at));

  return (
    <AuthWrapper>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your API keys for programmatic access to Kuttl
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-3 border border-transparent rounded-lg  text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Token
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{tokens.length}</div>
              <div className="text-sm text-gray-500">Total Keys</div>
              <div className="text-xs text-gray-500 mt-1">All time</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{activeTokens.length}</div>
              <div className="text-sm text-gray-500">Active Keys</div>
              <div className="text-xs text-green-500 mt-1">{tokens.length - activeTokens.length} inactive</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-500">Total Requests</div>
              <div className="text-xs text-gray-500 mt-1">Coming soon</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">-</div>
              <div className="text-sm text-gray-500">Success Rate</div>
              <div className="text-xs text-gray-500 mt-1">Coming soon</div>
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

          {/* Tokens List */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Your API Tokens</h3>
            </div>

            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                      <div className="w-20 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : tokens.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No API tokens</p>
                <p className="text-sm mt-1">Create your first API token to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tokens.map((token) => (
                  <div key={token.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Key className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{token.name}</h4>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>
                              <strong>Created:</strong> {formatDate(token.created_at)}
                            </span>
                            {token.last_used && (
                              <span>
                                <strong>Last used:</strong> {formatDate(token.last_used)}
                              </span>
                            )}
                            {token.expires_at && token.is_active && (
                              <span className={isExpired(token.expires_at) ? "text-red-600" : ""}>
                                <strong>Expires:</strong> {formatDate(token.expires_at)}
                                {isExpired(token.expires_at) && " (Expired)"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          token.is_active && !isExpired(token.expires_at)
                            ? " text-green-700"
                            : " text-red-700"
                        }`}>
                          {token.is_active && !isExpired(token.expires_at) ? "Active" : "Inactive"}
                        </span>
                        {token.is_active && !isExpired(token.expires_at) && (
                          <button
                            onClick={() => handleDisableClick(token.id, token.name)}
                            className="inline-flex items-center px-3 py-3 text-sm font-medium text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Disable token"
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Disable
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-3">Using Your API Tokens</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <p>Include your API token in the Authorization header of your HTTP requests:</p>
              <div className="bg-white border border-blue-300 rounded p-3">
                <code className="text-xs font-mono text-gray-900">
                  Authorization: Bearer YOUR_API_TOKEN
                </code>
              </div>
              <p>Example with curl:</p>
              <div className="bg-white border border-blue-300 rounded p-3">
                <code className="text-xs font-mono text-gray-900">
                  curl -H "Authorization: Bearer YOUR_API_TOKEN" {typeof window !== 'undefined' ? window.location.origin : 'https://api.kuttl.xyz'}/api/v1/snapshots
                </code>
              </div>
            </div>
          </div>

        </div>

        {/* Create Token Modal */}
        {showCreateModal && typeof window !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => {
                if (!newToken) {
                  setShowCreateModal(false);
                  setFormData({ name: "", expires_at: "" });
                }
              }}
            />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-lg">
              {/* Modal */}
              <div className="relative bg-white rounded-2xl -2xl">
                {!newToken ? (
                  // Create Token Form
                  <div className="p-8">
                    {/* Close button */}
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setShowCreateModal(false);
                        setFormData({ name: "", expires_at: "" });
                      }}
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Key className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Create New API Token
                        </h3>
                        <p className="text-sm text-gray-500">
                          Generate a new API token for programmatic access
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                      <div>
                        <label htmlFor="modal-name" className="block text-sm font-medium text-gray-700 mb-2">
                          Token Name *
                        </label>
                        <Input
                          type="text"
                          id="modal-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., My Website Integration"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="modal-expires" className="block text-sm font-medium text-gray-700 mb-2">
                          Expiration Date (optional)
                        </label>
                        <Input
                          type="date"
                          id="modal-expires"
                          value={formData.expires_at}
                          min={new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Leave empty for tokens that never expire. Must be at least tomorrow.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateModal(false);
                            setFormData({ name: "", expires_at: "" });
                          }}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creating}
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {creating ? "Creating..." : "Create Token"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  // Token Success Display
                  <div className="p-8">
                    {/* Close button */}
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                      onClick={() => {
                        setNewToken(null);
                        setShowCreateModal(false);
                        setFormData({ name: "", expires_at: "" });
                      }}
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        API key created successfully
                      </h3>
                      <p className="text-gray-600">
                        For security, this key will only be shown once. Please store it in a safe place.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            API Access Token
                          </div>
                          <code className="text-sm text-gray-600 font-mono break-all">
                            {newToken.token}
                          </code>
                        </div>
                        <button
                          onClick={() => copyToClipboard(newToken.token, "API token")}
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setNewToken(null);
                          setShowCreateModal(false);
                          setFormData({ name: "", expires_at: "" });
                        }}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Disable Token Confirmation Modal */}
        {showDisableModal && tokenToDisable && typeof window !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
              onClick={() => {
                setShowDisableModal(false);
                setTokenToDisable(null);
              }}
            />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-md">
              {/* Modal */}
              <div className="relative bg-white rounded-2xl -2xl p-6">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Disable API Token
                    </h3>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-gray-700">
                    Are you sure you want to disable the API token{' '}
                    <span className="font-semibold">"{tokenToDisable.name}"</span>?
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Any applications using this token will immediately lose access to the API.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisableModal(false);
                      setTokenToDisable(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDisableConfirm}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Disable Token
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </DashboardLayout>
    </AuthWrapper>
  );
}