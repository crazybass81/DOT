/**
 * 조직 관리 API 레이어
 * TDD Green Phase: 테스트를 통과시키는 최소 구현
 */

import { 
  OrganizationListParams, 
  OrganizationListResponse, 
  OrganizationStats,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  Organization
} from '@/types/organization.types';

class OrganizationApi {
  private baseUrl = '/api/organizations';

  private getAuthToken(): string {
    if (typeof window === 'undefined') {
      throw new Error('Cannot access localStorage in server environment');
    }

    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token') ||
                  localStorage.getItem('supabase.auth.token');
                  
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    return token;
  }

  private buildQueryString(params: OrganizationListParams): string {
    const searchParams = new URLSearchParams();
    
    // Pagination
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    
    if (params.pageSize) {
      searchParams.append('pageSize', params.pageSize.toString());
    }
    
    // Filters
    if (params.filters) {
      const { filters } = params;
      
      if (filters.search && filters.search.trim()) {
        searchParams.append('search', filters.search.trim());
      }
      
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(status => {
          searchParams.append('status', status);
        });
      }
      
      if (filters.type && filters.type.length > 0) {
        filters.type.forEach(type => {
          searchParams.append('type', type);
        });
      }
      
      if (filters.employeeCountRange) {
        if (filters.employeeCountRange.min !== undefined) {
          searchParams.append('employeeMin', filters.employeeCountRange.min.toString());
        }
        if (filters.employeeCountRange.max !== undefined) {
          searchParams.append('employeeMax', filters.employeeCountRange.max.toString());
        }
      }
      
      if (filters.dateRange) {
        if (filters.dateRange.startDate) {
          searchParams.append('startDate', filters.dateRange.startDate.toISOString().split('T')[0]);
        }
        if (filters.dateRange.endDate) {
          searchParams.append('endDate', filters.dateRange.endDate.toISOString().split('T')[0]);
        }
      }
      
      if (filters.parentOrganizationId) {
        searchParams.append('parentOrganizationId', filters.parentOrganizationId);
      }
    }
    
    // Sort
    if (params.sort) {
      searchParams.append('sortField', params.sort.field);
      searchParams.append('sortDirection', params.sort.direction);
    }
    
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  private async fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const token = this.getAuthToken();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async getOrganizationList(params: OrganizationListParams = {}): Promise<OrganizationListResponse> {
    const queryString = this.buildQueryString(params);
    const url = `${this.baseUrl}${queryString}`;
    
    const response = await this.fetchApi<{ organizations: any[] } & Omit<OrganizationListResponse, 'organizations'>>(url);
    
    // Transform dates from API response
    const organizations: Organization[] = response.organizations.map(org => ({
      ...org,
      createdAt: new Date(org.createdAt || org.created_at),
      updatedAt: new Date(org.updatedAt || org.updated_at)
    }));
    
    return {
      ...response,
      organizations
    };
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    const url = `${this.baseUrl}/stats`;
    return this.fetchApi<OrganizationStats>(url);
  }

  async getOrganization(id: string): Promise<Organization> {
    const url = `${this.baseUrl}/${id}`;
    const response = await this.fetchApi<{ organization: any }>(url);
    
    return {
      ...response.organization,
      createdAt: new Date(response.organization.createdAt || response.organization.created_at),
      updatedAt: new Date(response.organization.updatedAt || response.organization.updated_at)
    };
  }

  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    const url = this.baseUrl;
    const response = await this.fetchApi<{ organization: any }>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    return {
      ...response.organization,
      createdAt: new Date(response.organization.createdAt || response.organization.created_at),
      updatedAt: new Date(response.organization.updatedAt || response.organization.updated_at)
    };
  }

  async updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    const url = `${this.baseUrl}/${id}`;
    const response = await this.fetchApi<{ organization: any }>(url, {
      method: 'PUT',
      body: JSON.stringify({ id, ...data })
    });
    
    return {
      ...response.organization,
      createdAt: new Date(response.organization.createdAt || response.organization.created_at),
      updatedAt: new Date(response.organization.updatedAt || response.organization.updated_at)
    };
  }

  async deleteOrganization(id: string): Promise<void> {
    const url = `${this.baseUrl}?id=${id}`;
    await this.fetchApi<{ message: string }>(url, {
      method: 'DELETE'
    });
  }
}

export const organizationApi = new OrganizationApi();