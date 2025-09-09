// User Types - Basic implementation for build compatibility

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  BUSINESS_ADMIN = 'BUSINESS_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}