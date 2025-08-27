import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES } from '../dynamodb-client';
import { Employee, EmployeeRole, EmploymentType, WorkSchedule } from '../models/attendance.model';

export class EmployeeRepository {
  private tableName = TABLE_NAMES.EMPLOYEES;

  // Create new employee
  async createEmployee(data: Omit<Employee, 'employeeId' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const employeeId = uuidv4();
    const now = new Date().toISOString();
    
    const employee: Employee = {
      ...data,
      employeeId,
      createdAt: now,
      updatedAt: now,
      isActive: data.isActive ?? true,
      organizationIndex: `ORG#${data.organizationId}`,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `EMPLOYEE#${employeeId}`,
        SK: `ORG#${data.organizationId}`,
        ...employee,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await dynamoDBClient.send(command);
    return employee;
  }

  // Get employee by ID
  async getEmployeeById(employeeId: string, organizationId: string): Promise<Employee | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `EMPLOYEE#${employeeId}`,
        SK: `ORG#${organizationId}`,
      },
    });

    const result = await dynamoDBClient.send(command);
    if (!result.Item) return null;
    
    const { PK, SK, ...employee } = result.Item;
    return employee as Employee;
  }

  // Get employee by email
  async getEmployeeByEmail(email: string, organizationId: string): Promise<Employee | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.ORGANIZATION_INDEX,
      KeyConditionExpression: 'organizationIndex = :orgIndex',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':orgIndex': `ORG#${organizationId}`,
        ':email': email,
      },
    });

    const result = await dynamoDBClient.send(command);
    if (!result.Items || result.Items.length === 0) return null;
    
    const { PK, SK, ...employee } = result.Items[0];
    return employee as Employee;
  }

  // Get employee by Cognito User ID
  async getEmployeeByCognitoId(cognitoUserId: string): Promise<Employee | null> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'cognitoUserId = :cognitoId',
      ExpressionAttributeValues: {
        ':cognitoId': cognitoUserId,
      },
    });

    const result = await dynamoDBClient.send(command);
    if (!result.Items || result.Items.length === 0) return null;
    
    const { PK, SK, ...employee } = result.Items[0];
    return employee as Employee;
  }

  // Get all employees in organization
  async getEmployeesByOrganization(
    organizationId: string,
    options?: {
      departmentId?: string;
      isActive?: boolean;
      role?: EmployeeRole;
    }
  ): Promise<Employee[]> {
    let filterExpression = '';
    const expressionAttributeValues: any = {
      ':orgIndex': `ORG#${organizationId}`,
    };

    const filters = [];
    
    if (options?.departmentId !== undefined) {
      filters.push('departmentId = :deptId');
      expressionAttributeValues[':deptId'] = options.departmentId;
    }
    
    if (options?.isActive !== undefined) {
      filters.push('isActive = :active');
      expressionAttributeValues[':active'] = options.isActive;
    }
    
    if (options?.role) {
      filters.push('#role = :role');
      expressionAttributeValues[':role'] = options.role;
    }

    if (filters.length > 0) {
      filterExpression = filters.join(' AND ');
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.ORGANIZATION_INDEX,
      KeyConditionExpression: 'organizationIndex = :orgIndex',
      FilterExpression: filterExpression || undefined,
      ExpressionAttributeNames: options?.role ? { '#role': 'role' } : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []).map(item => {
      const { PK, SK, ...employee } = item;
      return employee as Employee;
    });
  }

  // Get employees by department
  async getEmployeesByDepartment(organizationId: string, departmentId: string): Promise<Employee[]> {
    return this.getEmployeesByOrganization(organizationId, { departmentId });
  }

  // Get employees by manager
  async getEmployeesByManager(managerId: string, organizationId: string): Promise<Employee[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.ORGANIZATION_INDEX,
      KeyConditionExpression: 'organizationIndex = :orgIndex',
      FilterExpression: 'managerId = :managerId',
      ExpressionAttributeValues: {
        ':orgIndex': `ORG#${organizationId}`,
        ':managerId': managerId,
      },
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []).map(item => {
      const { PK, SK, ...employee } = item;
      return employee as Employee;
    });
  }

  // Update employee
  async updateEmployee(
    employeeId: string,
    organizationId: string,
    updates: Partial<Omit<Employee, 'employeeId' | 'organizationId' | 'createdAt'>>
  ): Promise<Employee> {
    const now = new Date().toISOString();
    
    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: any = {};
    const expressionAttributeValues: any = {
      ':updatedAt': now,
    };

    updateExpressions.push('updatedAt = :updatedAt');

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'updatedAt') {
        const attributeKey = `:${key}`;
        updateExpressions.push(`#${key} = ${attributeKey}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[attributeKey] = value;
      }
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `EMPLOYEE#${employeeId}`,
        SK: `ORG#${organizationId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDBClient.send(command);
    const { PK, SK, ...updated } = result.Attributes!;
    return updated as Employee;
  }

  // Update employee status
  async updateEmployeeStatus(
    employeeId: string,
    organizationId: string,
    isActive: boolean
  ): Promise<Employee> {
    return this.updateEmployee(employeeId, organizationId, { isActive });
  }

  // Update employee role
  async updateEmployeeRole(
    employeeId: string,
    organizationId: string,
    role: EmployeeRole
  ): Promise<Employee> {
    return this.updateEmployee(employeeId, organizationId, { role });
  }

  // Update work schedule
  async updateWorkSchedule(
    employeeId: string,
    organizationId: string,
    workSchedule: WorkSchedule
  ): Promise<Employee> {
    return this.updateEmployee(employeeId, organizationId, { workSchedule });
  }

  // Delete employee (soft delete by marking inactive)
  async deleteEmployee(employeeId: string, organizationId: string, hardDelete = false): Promise<void> {
    if (hardDelete) {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `EMPLOYEE#${employeeId}`,
          SK: `ORG#${organizationId}`,
        },
      });
      await dynamoDBClient.send(command);
    } else {
      await this.updateEmployeeStatus(employeeId, organizationId, false);
    }
  }

  // Search employees
  async searchEmployees(
    organizationId: string,
    searchTerm: string
  ): Promise<Employee[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.ORGANIZATION_INDEX,
      KeyConditionExpression: 'organizationIndex = :orgIndex',
      FilterExpression: 'contains(#name, :search) OR contains(email, :search) OR contains(employeeCode, :search)',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':orgIndex': `ORG#${organizationId}`,
        ':search': searchTerm,
      },
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []).map(item => {
      const { PK, SK, ...employee } = item;
      return employee as Employee;
    });
  }

  // Get employee count by organization
  async getEmployeeCount(organizationId: string, isActive?: boolean): Promise<number> {
    const employees = await this.getEmployeesByOrganization(organizationId, { isActive });
    return employees.length;
  }

  // Batch get employees by IDs
  async batchGetEmployees(employeeIds: string[], organizationId: string): Promise<Employee[]> {
    if (employeeIds.length === 0) return [];

    const keys = employeeIds.map(id => ({
      PK: `EMPLOYEE#${id}`,
      SK: `ORG#${organizationId}`,
    }));

    // DynamoDB BatchGet supports max 100 items at once
    const chunks = [];
    for (let i = 0; i < keys.length; i += 100) {
      chunks.push(keys.slice(i, i + 100));
    }

    const employees: Employee[] = [];
    
    for (const chunk of chunks) {
      const command = new BatchGetCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: chunk,
          },
        },
      });
      
      const result = await dynamoDBClient.send(command);
      if (result.Responses?.[this.tableName]) {
        result.Responses[this.tableName].forEach(item => {
          const { PK, SK, ...employee } = item;
          employees.push(employee as Employee);
        });
      }
    }

    return employees;
  }
}