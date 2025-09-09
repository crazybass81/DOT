// Business Service - Basic implementation for build compatibility

export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export const businessService = {
  async getCurrentBusiness(): Promise<Business | null> {
    // Placeholder implementation
    return null;
  },

  async getBusinessById(id: string): Promise<Business | null> {
    // Placeholder implementation
    return null;
  },

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    // Placeholder implementation
    throw new Error('Not implemented');
  }
};