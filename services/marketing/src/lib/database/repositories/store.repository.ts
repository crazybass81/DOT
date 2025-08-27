import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES, TTL_SETTINGS } from '../dynamodb-client';
import { StoreEntity } from '../models/store.model';
import { StoreProfile } from '../../../matching-engine/types';

export class StoreRepository {
  private tableName = TABLE_NAMES.STORES;

  // Create or update store profile
  async upsertStore(profile: StoreProfile, userId?: string): Promise<StoreEntity> {
    const now = new Date().toISOString();
    const storeId = profile.storeId || uuidv4();
    
    // Check if store exists
    const existing = await this.getStore(storeId);
    
    const entity: StoreEntity = {
      ...profile,
      PK: `STORE#${storeId}`,
      SK: `PROFILE#${now}`,
      GSI1PK: `CATEGORY#${profile.primaryCategory}`,
      GSI1SK: `STORE#${storeId}`,
      GSI2PK: `LOCATION#${profile.location.city}#${profile.location.district}`,
      GSI2SK: `STORE#${storeId}`,
      GSI3PK: `PRICE#${profile.priceAnalysis.level}`,
      GSI3SK: `STORE#${storeId}`,
      entityType: 'STORE',
      storeId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      version: (existing?.version || 0) + 1,
      status: 'active',
      userId,
      ttl: Math.floor(Date.now() / 1000) + TTL_SETTINGS.SCRAPING_CACHE,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: entity,
    });

    await dynamoDBClient.send(command);
    return entity;
  }

  // Get store by ID
  async getStore(storeId: string): Promise<StoreEntity | null> {
    // Query for the latest profile
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STORE#${storeId}`,
      },
      ScanIndexForward: false, // Get latest first
      Limit: 1,
    });

    const result = await dynamoDBClient.send(command);
    return result.Items?.[0] as StoreEntity || null;
  }

  // Get store by URL (check cache)
  async getStoreByUrl(url: string): Promise<StoreEntity | null> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'sourceUrl = :url AND entityType = :type',
      ExpressionAttributeValues: {
        ':url': url,
        ':type': 'STORE',
      },
      Limit: 1,
    });

    const result = await dynamoDBClient.send(command);
    
    if (result.Items && result.Items.length > 0) {
      const store = result.Items[0] as StoreEntity;
      
      // Check if cache is still valid
      if (store.ttl && store.ttl > Math.floor(Date.now() / 1000)) {
        return store;
      }
    }
    
    return null;
  }

  // Get stores by category
  async getStoresByCategory(category: string, limit = 20): Promise<StoreEntity[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.STORE_CATEGORY_INDEX,
      KeyConditionExpression: 'GSI1PK = :category',
      ExpressionAttributeValues: {
        ':category': `CATEGORY#${category}`,
      },
      Limit: limit,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as StoreEntity[];
  }

  // Get stores by location
  async getStoresByLocation(
    city: string,
    district?: string,
    limit = 20
  ): Promise<StoreEntity[]> {
    const locationKey = district 
      ? `LOCATION#${city}#${district}`
      : `LOCATION#${city}`;
    
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.STORE_LOCATION_INDEX,
      KeyConditionExpression: district
        ? 'GSI2PK = :location'
        : 'begins_with(GSI2PK, :location)',
      ExpressionAttributeValues: {
        ':location': locationKey,
      },
      Limit: limit,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as StoreEntity[];
  }

  // Get stores by price level
  async getStoresByPriceLevel(
    level: 'budget' | 'moderate' | 'premium' | 'luxury',
    limit = 20
  ): Promise<StoreEntity[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.STORE_PRICE_INDEX,
      KeyConditionExpression: 'GSI3PK = :price',
      ExpressionAttributeValues: {
        ':price': `PRICE#${level}`,
      },
      Limit: limit,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as StoreEntity[];
  }

  // Search stores with filters
  async searchStores(filters: {
    category?: string;
    location?: { city?: string; district?: string };
    priceLevel?: string;
    minRating?: number;
    tags?: string[];
  }): Promise<StoreEntity[]> {
    let filterExpression = 'entityType = :entityType';
    const expressionAttributeValues: any = {
      ':entityType': 'STORE',
    };

    if (filters.minRating) {
      filterExpression += ' AND sentiment.overall >= :minRating';
      expressionAttributeValues[':minRating'] = filters.minRating;
    }

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag, index) => {
        filterExpression += ` AND contains(tags, :tag${index})`;
        expressionAttributeValues[`:tag${index}`] = tag;
      });
    }

    // Use GSI if category filter is provided
    if (filters.category) {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: GSI_NAMES.STORE_CATEGORY_INDEX,
        KeyConditionExpression: 'GSI1PK = :category',
        FilterExpression: filterExpression,
        ExpressionAttributeValues: {
          ':category': `CATEGORY#${filters.category}`,
          ...expressionAttributeValues,
        },
      });

      const result = await dynamoDBClient.send(command);
      return (result.Items || []) as StoreEntity[];
    }

    // Otherwise, scan (less efficient)
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as StoreEntity[];
  }

  // Update store status
  async updateStoreStatus(
    storeId: string,
    status: 'active' | 'inactive' | 'pending' | 'error'
  ): Promise<void> {
    const store = await this.getStore(storeId);
    if (!store) throw new Error('Store not found');

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: store.PK,
        SK: store.SK,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':now': new Date().toISOString(),
      },
    });

    await dynamoDBClient.send(command);
  }

  // Add tags to store
  async addTags(storeId: string, tags: string[]): Promise<void> {
    const store = await this.getStore(storeId);
    if (!store) throw new Error('Store not found');

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: store.PK,
        SK: store.SK,
      },
      UpdateExpression: 'SET tags = list_append(if_not_exists(tags, :empty), :tags), updatedAt = :now',
      ExpressionAttributeValues: {
        ':empty': [],
        ':tags': tags,
        ':now': new Date().toISOString(),
      },
    });

    await dynamoDBClient.send(command);
  }

  // Delete store
  async deleteStore(storeId: string): Promise<void> {
    const store = await this.getStore(storeId);
    if (!store) return;

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: store.PK,
        SK: store.SK,
      },
    });

    await dynamoDBClient.send(command);
  }

  // Get store history (all versions)
  async getStoreHistory(storeId: string): Promise<StoreEntity[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `STORE#${storeId}`,
      },
      ScanIndexForward: false, // Latest first
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []) as StoreEntity[];
  }

  // Batch get stores
  async batchGetStores(storeIds: string[]): Promise<StoreEntity[]> {
    const stores: StoreEntity[] = [];
    
    // Get stores in parallel
    const promises = storeIds.map(id => this.getStore(id));
    const results = await Promise.all(promises);
    
    results.forEach(store => {
      if (store) stores.push(store);
    });
    
    return stores;
  }

  // Clean expired cache entries
  async cleanExpiredCache(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'ttl < :now AND attribute_exists(ttl)',
      ExpressionAttributeValues: {
        ':now': now,
      },
    });

    const result = await dynamoDBClient.send(command);
    
    if (result.Items && result.Items.length > 0) {
      // Delete expired items
      for (const item of result.Items) {
        await dynamoDBClient.send(new DeleteCommand({
          TableName: this.tableName,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        }));
      }
      
      return result.Items.length;
    }
    
    return 0;
  }
}