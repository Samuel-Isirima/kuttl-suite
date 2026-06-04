import ky from 'ky';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Create API client
export const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30000,
  hooks: {
    beforeRequest: [
      (request) => {
        // Add auth token if available
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
        }
      }
    ]
  }
});

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('auth/login', { json: credentials }).json<{
        success: boolean;
        data: {
          user: any;
          token: string;
        };
      }>();
      
      // Store auth data
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      console.log('Login successful, token stored:', response.data.token ? 'YES' : 'NO');
      console.log('User data stored:', response.data.user);
      
      return response.data;
    } catch (error: any) {
      // Extract error message from response body
      if (error.response) {
        const errorData = await error.response.json();
        throw new Error(errorData.error || errorData.message || 'Login failed');
      }
      throw error;
    }
  },

  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post('auth/register', { json: data }).json<{
      success: boolean;
      data: {
        user: any;
        message: string;
      };
    }>();
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  verifyEmail: async (token: string) => {
    return api.get(`auth/verify-email?token=${token}`).json<{
      message: string;
    }>();
  },

  resendVerification: async (email: string) => {
    return api.post('auth/resend-verification', { json: { email } }).json<{
      message: string;
    }>();
  },

  forgotPassword: async (email: string) => {
    return api.post('auth/forgot-password', { json: { email } }).json<{
      message: string;
    }>();
  },

  resetPassword: async (data: { token: string; new_password: string }) => {
    return api.post('auth/reset-password', { json: data }).json<{
      message: string;
    }>();
  },

  changePassword: async (data: { current_password: string; new_password: string }) => {
    return api.post('auth/change-password', { json: data }).json<{
      message: string;
    }>();
  },

  getProfile: async () => {
    return api.get('auth/profile').json<any>();
  }
};

// Dashboard API
export const dashboardApi = {
  getDashboard: async () => {
    return api.get('dashboard').json<{
      user: {
        id: string;
        name: string;
        email: string;
      };
      metrics: {
        total_websites: number;
        total_snapshots: number;
        total_api_requests: number;
        total_customizations: number;
        snapshots_this_month: number;
        api_requests_this_month: number;
        customizations_this_month: number;
        last_calculated_at: string;
      };
      recent_activity: Array<{
        website_id: string;
        snapshot_created_at: string;
        component_count: number;
        customization_count: number;
      }>;
    }>();
  },

  getMetrics: async () => {
    return api.get('dashboard/metrics').json<{
      total_websites: number;
      total_snapshots: number;
      total_api_requests: number;
      total_customizations: number;
      snapshots_this_month: number;
      api_requests_this_month: number;
      customizations_this_month: number;
      last_calculated_at: string;
    }>();
  },

  getRecentActivity: async () => {
    return api.get('dashboard/activity').json<Array<{
      website_id: string;
      snapshot_created_at: string;
      component_count: number;
      customization_count: number;
    }>>();
  },

  getAnalyticsData: async () => {
    return api.get('dashboard/analytics').json<Array<{
      name: string;
      value: number;
      requests: number;
      month: string;
    }>>();
  },

  getUsageData: async () => {
    return api.get('dashboard/usage').json<Array<{
      name: string;
      value: number;
      color: string;
    }>>();
  },

  getCustomizationsByPlan: async () => {
    return api.get('dashboard/customizations-by-plan').json<{
      total: number;
      growth: number;
      premium: {
        count: number;
        percentage: number;
      };
      free: {
        count: number;
        percentage: number;
      };
    }>();
  }
};

// Customizations API
export const customizationsApi = {
  list: async (params?: { limit?: number; offset?: number; status?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    
    const response = await api.get(`customizations?${searchParams}`).json<{
      success: boolean;
      data: Array<{
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
      }>;
    }>();
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('customizations/stats').json<{
      success: boolean;
      data: {
        total_changes: number;
        success_rate: number;
        pending_changes: number;
        avg_apply_time: number;
      };
    }>();
    return response.data;
  },

  create: async (data: {
    website_url: string;
    user_request: string;
    change_description: string;
    element_targeted: string;
    modification_type: string;
  }) => {
    const response = await api.post('customizations', { json: data }).json<{
      success: boolean;
      data: { id: string };
    }>();
    return response.data;
  }
};

// API Keys API
export const apiKeysApi = {
  list: async () => {
    const response = await api.get('auth/tokens').json<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        token_prefix: string;
        last_used: string | null;
        expires_at: string | null;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }>;
    }>();
    return response.data;
  },

  create: async (data: { name: string; expires_at?: string }) => {
    const response = await api.post('auth/tokens', { json: data }).json<{
      success: boolean;
      data: {
        id: string;
        name: string;
        token: string;
        token_prefix: string;
        created_at: string;
      };
    }>();
    return response.data;
  },

  revoke: async (tokenId: string) => {
    return api.delete(`auth/tokens/${tokenId}`).json<{
      message: string;
    }>();
  }
};

// Websites API
export const websitesApi = {
  list: async () => {
    const response = await api.get('websites').json<{
      success: boolean;
      data: Array<{
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
      }>;
    }>();
    return response.data;
  },

  create: async (data: {
    name: string;
    url: string;
    description?: string;
  }) => {
    const response = await api.post('websites', { json: data }).json<{
      success: boolean;
      data: {
        id: string;
        user_id: string;
        name: string;
        url: string;
        description?: string;
        hash_key: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        total_requests: number;
      };
    }>();
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get(`websites/${id}`).json<{
      success: boolean;
      data: any;
    }>();
    return response.data;
  },

  update: async (id: string, data: {
    name?: string;
    url?: string;
    description?: string;
    is_active?: boolean;
  }) => {
    const response = await api.put(`websites/${id}`, { json: data }).json<{
      success: boolean;
      message: string;
    }>();
    return response;
  },

  delete: async (id: string) => {
    const response = await api.delete(`websites/${id}`).json<{
      success: boolean;
      message: string;
    }>();
    return response;
  }
};

// Snapshots API
export const snapshotsApi = {
  list: async (params?: { website_id?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.website_id) searchParams.set('website_id', params.website_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    return api.get(`api/snapshots?${searchParams}`).json<any[]>();
  },

  create: async (data: any) => {
    return api.post('api/snapshots', { json: data }).json<{
      id: string;
      website_id: string;
      created_at: string;
    }>();
  },

  get: async (id: string) => {
    return api.get(`api/snapshots/${id}`).json<any>();
  }
};

// Utility functions
export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!getStoredToken();
};