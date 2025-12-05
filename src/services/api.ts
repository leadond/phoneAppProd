/**
 * API Service for Business Phone Number Management (FastAPI backend)
 */

const API_BASE_URL = '/api';

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  id: number;
  username: string;
  role: string;
}

export interface PhoneNumberResponse {
  id: number;
  phone_number: string;
  extension?: string;
  status: string;
  assigned_to_name?: string;
  assigned_to_department?: string;
  assigned_to_project?: string;
  system?: string;
  notes?: string;
  assigned_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResponse {
  phone_numbers: PhoneNumberResponse[];
  total_count: number;
  page: number;
  per_page: number;
  duplicate_extensions: Record<string, PhoneNumberResponse[]>;
}

export interface CheckoutRequest {
  count: number;
  assigned_to_name: string;
  assigned_to_department?: string;
  assigned_to_project?: string;
  notes?: string;
}

export interface RangeCheckoutRequest {
  start_pattern: string;
  end_pattern: string;
  assigned_to_name: string;
  assigned_to_department?: string;
  assigned_to_project?: string;
  notes?: string;
}

// Matches FastAPI /api/statistics output in app.py
export interface StatisticsResponse {
  total_phone_numbers: number;
  assigned_numbers: number;
  available_numbers: number;
  blocked_numbers: number;
  area_codes_count: number;
  systems_count: number;
  utilization_rate: number;
  total_ranges: number;
}

export interface ImportResult {
  message: string;
  success_count: number;
  error_count: number;
  errors: string[];
}

export interface AuditEvent {
  id: number;
  timestamp: string;
  user_id?: number | null;
  username?: string | null;
  category?: string | null;
  action: string;
  details?: any;
}

export interface TagResponse {
  id: number;
  name: string;
  color: string;
}

export interface SavedSearchResponse {
  id: number;
  user_id?: number | null;
  name: string;
  filters: any;
  created_at?: string;
}

export interface NumberRangeResponse {
  id: number;
  name: string;
  pattern: string;
  start_number: string;
  end_number: string;
  total_numbers: number;
  available_numbers: number;
  assigned_numbers: number;
  reserved_numbers: number;
  carrier: string;
  location: string;
  department: string;
  date_created: string;
  notes?: string;
  status: string;
  project?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookResponse {
  id: number;
  name: string;
  url: string;
  event_types: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookDelivery {
  id: number;
  webhook_id?: number | null;
  url: string;
  event_type: string;
  status_code?: number | null;
  error?: string | null;
  attempt_timestamp: string;
  payload?: any;
}

export interface PBXCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  certificatePath?: string;
  tenantId?: string;
  region?: string;
}

export interface PBXConnectionSettings {
  timeout: number;
  retryAttempts: number;
  validateSsl: boolean;
}

export interface PBXSyncSettings {
  dataMapping: Record<string, string>;
  excludeFields?: string[];
  customFilters?: string;
}

export interface PBXSystemResponse {
  id: number;
  name: string;
  type: string;
  status: string;
  last_sync?: string;
  numbers_managed: number;
  sync_enabled: boolean;
  endpoint: string;
  version?: string;
  health: string;
  auth_type: string;
  credentials: PBXCredentials;
  connection_settings: PBXConnectionSettings;
  sync_settings: PBXSyncSettings;
  created_at?: string;
  updated_at?: string;
}

export interface PBXSyncRun {
  id: number;
  system_id: number;
  type: string;
  status: string;
  started_at: string;
  finished_at?: string;
  numbers_before?: number;
  numbers_after?: number;
  changes_added?: number;
  changes_updated?: number;
  changes_removed?: number;
  error?: string | null;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Authentication token storage (use distinct key to avoid Node auth collision)
const TOKEN_KEY = 'bp_auth_token';
let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

// Helper function to make authenticated requests
const makeRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    throw new ApiError(401, 'Authentication required');
  }

  return response;
};

// API Service
export const apiService = {
  // Authentication
  async login(username: string, password: string): Promise<UserResponse> {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Login failed');
    }

    const data: any = await response.json();

    if (data.token) {
      authToken = data.token;
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, authToken);
      }
    }

    return {
      id: data.id,
      username: data.username,
      role: data.role,
    };
  },

  async logout(): Promise<void> {
    try {
      await makeRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore server logout errors, just clear token locally
    } finally {
      authToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  },

  async getCurrentUser(): Promise<UserResponse> {
    const response = await makeRequest('/api/auth/me');

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to get current user');
    }

    return response.json();
  },

  // Phone Numbers
  async getPhoneNumbers(params: {
    page?: number;
    per_page?: number;
    search?: string;
    status_filter?: string;
    system_filter?: string;
  } = {}): Promise<SearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status_filter) queryParams.append('status_filter', params.status_filter);
    if (params.system_filter) queryParams.append('system_filter', params.system_filter);

    const response = await makeRequest(`/api/phone-numbers?${queryParams.toString()}`);

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch phone numbers');
    }

    return response.json();
  },

  async getPhoneNumber(id: number): Promise<PhoneNumberResponse> {
    const response = await makeRequest(`/api/phone-numbers/${id}`);

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch phone number');
    }

    return response.json();
  },

  async createPhoneNumber(phoneNumber: Partial<PhoneNumberResponse>): Promise<PhoneNumberResponse> {
    const response = await makeRequest('/api/phone-numbers', {
      method: 'POST',
      body: JSON.stringify(phoneNumber),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to create phone number');
    }

    return response.json();
  },

  async updatePhoneNumber(id: number, phoneNumber: Partial<PhoneNumberResponse>): Promise<PhoneNumberResponse> {
    const response = await makeRequest(`/api/phone-numbers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(phoneNumber),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to update phone number');
    }

    return response.json();
  },

  async deletePhoneNumber(id: number): Promise<void> {
    const response = await makeRequest(`/api/phone-numbers/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to delete phone number');
    }
  },

  // Checkout operations
  async checkoutNumbers(request: CheckoutRequest): Promise<{ message: string; checked_out_numbers: string[] }> {
    const response = await makeRequest('/api/phone-numbers/checkout', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to checkout numbers');
    }

    return response.json();
  },

  async checkoutRangeNumbers(request: RangeCheckoutRequest): Promise<{ message: string; checked_out_numbers: string[] }> {
    const response = await makeRequest('/api/phone-numbers/range-checkout', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to checkout range');
    }

    return response.json();
  },

  async unassignNumber(id: number): Promise<{ message: string }> {
    const response = await makeRequest(`/api/phone-numbers/${id}/unassign`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to unassign number');
    }

    return response.json();
  },

  // Export
  async exportCSV(search?: string): Promise<{ message: string; filename: string }> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await makeRequest(`/api/export/csv${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to export CSV');
    }

    return response.json();
  },

  async exportExcel(search?: string): Promise<{ message: string; filename: string }> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await makeRequest(`/api/export/excel${params}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to export Excel');
    }

    return response.json();
  },

  // Statistics
  async getStatistics(): Promise<StatisticsResponse> {
    const response = await makeRequest('/api/statistics');

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch statistics');
    }

    return response.json();
  },

  // Systems
  async getSystems(): Promise<{ systems: string[] }> {
    const response = await makeRequest('/api/systems');

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch systems');
    }

    return response.json();
  },

  // PBX systems
  async getPBXSystems(): Promise<{ systems: PBXSystemResponse[] }> {
    const response = await makeRequest('/api/pbx-systems');
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch PBX systems');
    }
    return response.json();
  },

  async createPBXSystem(system: Omit<PBXSystemResponse, 'id' | 'created_at' | 'updated_at'>): Promise<PBXSystemResponse> {
    const response = await makeRequest('/api/pbx-systems', {
      method: 'POST',
      body: JSON.stringify(system),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to create PBX system');
    }
    return response.json();
  },

  async updatePBXSystem(id: number, updates: Partial<PBXSystemResponse>): Promise<PBXSystemResponse> {
    const response = await makeRequest(`/api/pbx-systems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to update PBX system');
    }
    return response.json();
  },

  async deletePBXSystem(id: number): Promise<void> {
    const response = await makeRequest(`/api/pbx-systems/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to delete PBX system');
    }
  },

  async runPBXSync(systemId: number, type: 'full' | 'incremental' | 'validation' = 'incremental'):
    Promise<{ system: PBXSystemResponse; run: PBXSyncRun }> {
    const response = await makeRequest(`/api/pbx-systems/${systemId}/sync`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to run PBX sync');
    }
    return response.json();
  },

  async getPBXSyncRuns(systemId: number, limit?: number): Promise<{ runs: PBXSyncRun[] }> {
    const query = new URLSearchParams();
    if (limit) query.append('limit', String(limit));
    const response = await makeRequest(`/api/pbx-systems/${systemId}/sync-runs?${query.toString()}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to fetch PBX sync runs');
    }
    return response.json();
  },

  // Audit log
  async getAuditLog(params: {
    user?: string;
    action?: string;
    date?: string; // YYYY-MM-DD
    limit?: number;
  } = {}): Promise<{ events: AuditEvent[] }> {
    const query = new URLSearchParams();
    if (params.user) query.append('user', params.user);
    if (params.action) query.append('action', params.action);
    if (params.date) query.append('date', params.date);
    if (params.limit) query.append('limit', String(params.limit));

    const response = await makeRequest(`/api/audit-log?${query.toString()}`);
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch audit log');
    }
    return response.json();
  },

  // Webhook deliveries
  async getWebhookDeliveries(params: {
    limit?: number;
    webhook_id?: number;
    event_type?: string;
    import_id?: string;
  } = {}): Promise<{ deliveries: WebhookDelivery[] }> {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', String(params.limit));
    if (params.webhook_id !== undefined) query.append('webhook_id', String(params.webhook_id));
    if (params.event_type) query.append('event_type', params.event_type);
    if (params.import_id) query.append('import_id', params.import_id);

    const response = await makeRequest(`/api/webhook-deliveries?${query.toString()}`);
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch webhook deliveries');
    }
    return response.json();
  },

  // Tags
  async getTags(): Promise<{ tags: TagResponse[] }> {
    const response = await makeRequest('/api/tags');
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch tags');
    }
    return response.json();
  },

  async createTag(name: string, color: string): Promise<TagResponse> {
    const response = await makeRequest('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to create tag');
    }
    return response.json();
  },

  async deleteTag(id: number): Promise<void> {
    const response = await makeRequest(`/api/tags/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to delete tag');
    }
  },

  async addTagToPhoneNumber(phoneId: number, tagId: number): Promise<void> {
    const response = await makeRequest(`/api/phone-numbers/${phoneId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tag_id: tagId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to add tag to phone number');
    }
  },

  async removeTagFromPhoneNumber(phoneId: number, tagId: number): Promise<void> {
    const response = await makeRequest(`/api/phone-numbers/${phoneId}/tags/${tagId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to remove tag from phone number');
    }
  },

  // Saved searches
  async getSavedSearches(): Promise<{ saved_searches: SavedSearchResponse[] }> {
    const response = await makeRequest('/api/saved-searches');
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch saved searches');
    }
    return response.json();
  },

  async saveSearch(name: string, filters: any): Promise<SavedSearchResponse> {
    const response = await makeRequest('/api/saved-searches', {
      method: 'POST',
      body: JSON.stringify({ name, filters }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to save search');
    }
    return response.json();
  },

  async deleteSavedSearch(id: number): Promise<void> {
    const response = await makeRequest(`/api/saved-searches/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to delete saved search');
    }
  },

  // Number ranges
  async getNumberRanges(): Promise<{ ranges: NumberRangeResponse[] }> {
    const response = await makeRequest('/api/number-ranges');
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch number ranges');
    }
    return response.json();
  },

  async createNumberRange(range: Omit<NumberRangeResponse, 'id' | 'created_at' | 'updated_at'>): Promise<NumberRangeResponse> {
    const response = await makeRequest('/api/number-ranges', {
      method: 'POST',
      body: JSON.stringify(range),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to create number range');
    }
    return response.json();
  },

  async updateNumberRange(id: number, updates: Partial<NumberRangeResponse>): Promise<NumberRangeResponse> {
    const response = await makeRequest(`/api/number-ranges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to update number range');
    }
    return response.json();
  },

  async deleteNumberRange(id: number): Promise<void> {
    const response = await makeRequest(`/api/number-ranges/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to delete number range');
    }
  },

  // Webhooks
  async getWebhooks(): Promise<{ webhooks: WebhookResponse[] }> {
    const response = await makeRequest('/api/webhooks');
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch webhooks');
    }
    return response.json();
  },

  async createWebhook(name: string, url: string, eventTypes: string[]): Promise<WebhookResponse> {
    const response = await makeRequest('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify({ name, url, event_types: eventTypes }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to create webhook');
    }
    return response.json();
  },

  async updateWebhook(id: number, data: Partial<WebhookResponse>): Promise<WebhookResponse> {
    const response = await makeRequest(`/api/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        url: data.url,
        event_types: data.event_types,
        is_active: data.is_active,
      }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to update webhook');
    }
    return response.json();
  },

  async deleteWebhook(id: number): Promise<void> {
    const response = await makeRequest(`/api/webhooks/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to delete webhook');
    }
  },

  // Skype/CSV import
  async importSkypeFile(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await makeRequest('/api/import/phone-numbers', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(response.status, (error as any).detail || 'Failed to import file');
    }

    return response.json();
  },
};

export { ApiError };
