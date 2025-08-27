import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES } from '../dynamodb-client';
import { CampaignEntity, CampaignStatus, CampaignType } from '../models/campaign.model';

export class CampaignRepository {
  private tableName = TABLE_NAMES.CAMPAIGNS;

  async createCampaign(campaign: Partial<CampaignEntity>, userId: string): Promise<CampaignEntity> {
    const now = new Date().toISOString();
    const campaignId = uuidv4();

    const entity: CampaignEntity = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: `STORE#${campaign.storeId}`,
      GSI1PK: `STATUS#${CampaignStatus.DRAFT}`,
      GSI1SK: `DATE#${campaign.timeline?.startDate || now}`,
      GSI2PK: `STORE#${campaign.storeId}`,
      GSI2SK: `DATE#${now}`,
      entityType: 'CAMPAIGN',
      campaignId,
      campaignName: campaign.campaignName || 'Untitled Campaign',
      campaignType: campaign.campaignType || CampaignType.REVIEW,
      description: campaign.description || '',
      storeId: campaign.storeId!,
      storeName: campaign.storeName!,
      objectives: campaign.objectives || [],
      targetAudience: campaign.targetAudience || {
        demographics: [],
        interests: [],
        locations: [],
      },
      timeline: campaign.timeline || {
        startDate: now,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      budget: campaign.budget || {
        total: 0,
        allocated: 0,
        spent: 0,
        currency: 'KRW',
      },
      creators: campaign.creators || [],
      contentRequirements: campaign.contentRequirements || {
        platforms: [],
        formats: [],
        quantity: 0,
      },
      kpis: campaign.kpis || {
        targetReach: 0,
        targetEngagement: 0,
      },
      status: CampaignStatus.DRAFT,
      statusHistory: [{
        status: CampaignStatus.DRAFT,
        timestamp: now,
        updatedBy: userId,
      }],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      managedBy: [userId],
      priority: 'medium',
      ...campaign,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: this.tableName,
      Item: entity,
    }));

    return entity;
  }

  async getCampaign(campaignId: string): Promise<CampaignEntity | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CAMPAIGN#${campaignId}`,
      },
      Limit: 1,
    }));

    return result.Items?.[0] as CampaignEntity || null;
  }

  async getCampaignsByStatus(status: CampaignStatus, limit = 20): Promise<CampaignEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CAMPAIGN_STATUS_INDEX,
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': `STATUS#${status}`,
      },
      ScanIndexForward: false,
      Limit: limit,
    }));

    return (result.Items || []) as CampaignEntity[];
  }

  async getCampaignsByStore(storeId: string): Promise<CampaignEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CAMPAIGN_STORE_INDEX,
      KeyConditionExpression: 'GSI2PK = :storeId',
      ExpressionAttributeValues: {
        ':storeId': `STORE#${storeId}`,
      },
      ScanIndexForward: false,
    }));

    return (result.Items || []) as CampaignEntity[];
  }

  async updateCampaignStatus(
    campaignId: string,
    status: CampaignStatus,
    reason?: string,
    userId?: string
  ): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const now = new Date().toISOString();
    const statusUpdate = {
      status,
      timestamp: now,
      reason,
      updatedBy: userId || 'system',
    };

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: campaign.PK,
        SK: campaign.SK,
      },
      UpdateExpression: `
        SET #status = :status,
            statusHistory = list_append(statusHistory, :statusUpdate),
            GSI1PK = :newStatusKey,
            updatedAt = :now
            ${status === CampaignStatus.COMPLETED ? ', completedAt = :now' : ''}
      `,
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':statusUpdate': [statusUpdate],
        ':newStatusKey': `STATUS#${status}`,
        ':now': now,
      },
    }));
  }

  async updateCampaignBudget(
    campaignId: string,
    budgetUpdate: Partial<CampaignEntity['budget']>
  ): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {
      ':now': new Date().toISOString(),
    };

    Object.entries(budgetUpdate).forEach(([key, value]) => {
      updateExpressions.push(`budget.${key} = :budget_${key}`);
      expressionAttributeValues[`:budget_${key}`] = value;
    });

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: campaign.PK,
        SK: campaign.SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}, updatedAt = :now`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async addCreatorToCampaign(
    campaignId: string,
    creator: CampaignEntity['creators'][0]
  ): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: campaign.PK,
        SK: campaign.SK,
      },
      UpdateExpression: 'SET creators = list_append(creators, :creator), updatedAt = :now',
      ExpressionAttributeValues: {
        ':creator': [creator],
        ':now': new Date().toISOString(),
      },
    }));
  }

  async updateCampaignPerformance(
    campaignId: string,
    performance: CampaignEntity['performance']
  ): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: campaign.PK,
        SK: campaign.SK,
      },
      UpdateExpression: 'SET performance = :performance, updatedAt = :now',
      ExpressionAttributeValues: {
        ':performance': {
          ...performance,
          lastUpdated: new Date().toISOString(),
        },
        ':now': new Date().toISOString(),
      },
    }));
  }

  async getActiveCampaigns(): Promise<CampaignEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.CAMPAIGN_STATUS_INDEX,
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': `STATUS#${CampaignStatus.ACTIVE}`,
      },
    }));

    return (result.Items || []) as CampaignEntity[];
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) return;

    await dynamoDBClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: campaign.PK,
        SK: campaign.SK,
      },
    }));
  }
}