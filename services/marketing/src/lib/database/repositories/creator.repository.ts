import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchGetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES } from '../dynamodb-client';
import { CreatorEntity } from '../models/creator.model';
import { Creator } from '../../../matching-engine/types';

export class CreatorRepository {
  private tableName = TABLE_NAMES.CREATORS;

  async createCreator(creator: Creator): Promise<CreatorEntity> {
    const now = new Date().toISOString();
    const creatorId = creator.creatorId || uuidv4();
    
    const tier = this.getInfluenceTier(creator.statistics.subscribers);
    
    const entity: CreatorEntity = {
      ...creator,
      PK: `CREATOR#${creatorId}`,
      SK: `PLATFORM#${creator.platform}#${creator.channelId}`,
      GSI1PK: `CATEGORY#${creator.content.primaryCategory}`,
      GSI1SK: `CREATOR#${creatorId}`,
      GSI2PK: `LOCATION#${creator.coverage.primaryRegions[0] || 'GLOBAL'}`,
      GSI2SK: `CREATOR#${creatorId}`,
      GSI3PK: `PLATFORM#${creator.platform}`,
      GSI3SK: `INFLUENCE#${String(creator.statistics.subscribers).padStart(10, '0')}`,
      GSI4PK: `INFLUENCE_TIER#${tier}`,
      GSI4SK: `ENGAGEMENT#${String(Math.floor(creator.statistics.engagementRate * 100)).padStart(3, '0')}`,
      entityType: 'CREATOR',
      creatorId,
      influenceTier: tier,
      isVerified: false,
      trustScore: 0,
      performance: {
        avgSponsorshipSuccess: 0,
        completedCampaigns: 0,
        responseRate: 0,
        avgResponseTime: 0,
      },
      pricing: {
        currency: 'KRW',
        negotiable: true,
      },
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: creator.recentActivity.lastUpload.toISOString(),
      version: 1,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: this.tableName,
      Item: entity,
    }));

    return entity;
  }

  async getCreator(creatorId: string, platform: string, channelId: string): Promise<CreatorEntity | null> {
    const result = await dynamoDBClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `CREATOR#${creatorId}`,
        SK: `PLATFORM#${platform}#${channelId}`,
      },
    }));

    return result.Item as CreatorEntity || null;
  }

  async getCreatorsByCategory(category: string, limit = 20): Promise<CreatorEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CREATOR_CATEGORY_INDEX,
      KeyConditionExpression: 'GSI1PK = :category',
      ExpressionAttributeValues: {
        ':category': `CATEGORY#${category}`,
      },
      Limit: limit,
    }));

    return (result.Items || []) as CreatorEntity[];
  }

  async getCreatorsByLocation(region: string, limit = 20): Promise<CreatorEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CREATOR_LOCATION_INDEX,
      KeyConditionExpression: 'GSI2PK = :location',
      ExpressionAttributeValues: {
        ':location': `LOCATION#${region}`,
      },
      Limit: limit,
    }));

    return (result.Items || []) as CreatorEntity[];
  }

  async getCreatorsByPlatform(platform: string, minSubscribers?: number, limit = 20): Promise<CreatorEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CREATOR_PLATFORM_INDEX,
      KeyConditionExpression: minSubscribers
        ? 'GSI3PK = :platform AND GSI3SK >= :minSubs'
        : 'GSI3PK = :platform',
      ExpressionAttributeValues: {
        ':platform': `PLATFORM#${platform}`,
        ...(minSubscribers && {
          ':minSubs': `INFLUENCE#${String(minSubscribers).padStart(10, '0')}`,
        }),
      },
      Limit: limit,
    }));

    return (result.Items || []) as CreatorEntity[];
  }

  async getCreatorsByInfluenceTier(tier: string, minEngagement?: number, limit = 20): Promise<CreatorEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CREATOR_INFLUENCE_INDEX,
      KeyConditionExpression: minEngagement
        ? 'GSI4PK = :tier AND GSI4SK >= :minEngagement'
        : 'GSI4PK = :tier',
      ExpressionAttributeValues: {
        ':tier': `INFLUENCE_TIER#${tier}`,
        ...(minEngagement && {
          ':minEngagement': `ENGAGEMENT#${String(Math.floor(minEngagement)).padStart(3, '0')}`,
        }),
      },
      Limit: limit,
    }));

    return (result.Items || []) as CreatorEntity[];
  }

  async updateCreatorStatus(creatorId: string, platform: string, channelId: string, status: string): Promise<void> {
    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `CREATOR#${creatorId}`,
        SK: `PLATFORM#${platform}#${channelId}`,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':now': new Date().toISOString(),
      },
    }));
  }

  async updateCreatorMetrics(
    creatorId: string,
    platform: string,
    channelId: string,
    metrics: Partial<Creator['statistics']>
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {
      ':now': new Date().toISOString(),
    };

    Object.entries(metrics).forEach(([key, value]) => {
      updateExpressions.push(`statistics.${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    });

    if (metrics.subscribers) {
      const tier = this.getInfluenceTier(metrics.subscribers);
      updateExpressions.push('influenceTier = :tier');
      expressionAttributeValues[':tier'] = tier;
    }

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `CREATOR#${creatorId}`,
        SK: `PLATFORM#${platform}#${channelId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}, updatedAt = :now`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async searchCreators(filters: {
    category?: string;
    location?: string;
    platform?: string;
    minSubscribers?: number;
    maxSubscribers?: number;
    minEngagementRate?: number;
    languages?: string[];
  }): Promise<CreatorEntity[]> {
    if (filters.category) {
      return this.getCreatorsByCategory(filters.category);
    }

    if (filters.platform) {
      return this.getCreatorsByPlatform(filters.platform, filters.minSubscribers);
    }

    let filterExpression = 'entityType = :entityType';
    const expressionAttributeValues: any = {
      ':entityType': 'CREATOR',
    };

    if (filters.minSubscribers) {
      filterExpression += ' AND statistics.subscribers >= :minSubs';
      expressionAttributeValues[':minSubs'] = filters.minSubscribers;
    }

    if (filters.maxSubscribers) {
      filterExpression += ' AND statistics.subscribers <= :maxSubs';
      expressionAttributeValues[':maxSubs'] = filters.maxSubscribers;
    }

    if (filters.minEngagementRate) {
      filterExpression += ' AND statistics.engagementRate >= :minEngagement';
      expressionAttributeValues[':minEngagement'] = filters.minEngagementRate;
    }

    const result = await dynamoDBClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: 100,
    }));

    return (result.Items || []) as CreatorEntity[];
  }

  private getInfluenceTier(subscribers: number): 'nano' | 'micro' | 'mid' | 'macro' | 'mega' {
    if (subscribers < 1000) return 'nano';
    if (subscribers < 10000) return 'micro';
    if (subscribers < 100000) return 'mid';
    if (subscribers < 1000000) return 'macro';
    return 'mega';
  }
}