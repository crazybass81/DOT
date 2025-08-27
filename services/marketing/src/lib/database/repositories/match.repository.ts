import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES, TTL_SETTINGS } from '../dynamodb-client';
import { MatchEntity, MatchStatus } from '../models/match.model';
import { MatchingResult } from '../../../matching-engine/types';

export class MatchRepository {
  private tableName = TABLE_NAMES.MATCHES;

  async createMatch(
    storeId: string,
    storeName: string,
    creatorId: string,
    creatorName: string,
    matchResult: MatchingResult,
    userId: string
  ): Promise<MatchEntity> {
    const now = new Date().toISOString();
    const matchId = uuidv4();
    const scoreRange = Math.floor(matchResult.matchScore / 10) * 10;

    const entity: MatchEntity = {
      PK: `MATCH#${matchId}`,
      SK: `STORE#${storeId}#CREATOR#${creatorId}`,
      GSI1PK: `SCORE#${String(scoreRange).padStart(3, '0')}`,
      GSI1SK: `MATCH#${matchId}`,
      GSI2PK: `STATUS#${MatchStatus.PENDING}`,
      GSI2SK: `DATE#${now}`,
      GSI3PK: `DATE#${now.split('T')[0]}`,
      GSI3SK: `SCORE#${String(Math.floor(matchResult.matchScore)).padStart(3, '0')}`,
      entityType: 'MATCH',
      matchId,
      storeId,
      storeName,
      creatorId,
      creatorName,
      matchResult,
      matchScore: matchResult.matchScore,
      confidence: matchResult.confidence,
      status: MatchStatus.PENDING,
      statusHistory: [{
        status: MatchStatus.PENDING,
        timestamp: now,
        updatedBy: userId,
      }],
      communication: {
        contactAttempts: 0,
        responseReceived: false,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      priority: this.getPriority(matchResult.matchScore),
      isHot: matchResult.matchScore >= 80,
      ttl: Math.floor(Date.now() / 1000) + TTL_SETTINGS.MATCH_RESULTS,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: this.tableName,
      Item: entity,
    }));

    return entity;
  }

  async getMatch(matchId: string): Promise<MatchEntity | null> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `MATCH#${matchId}`,
      },
      Limit: 1,
    }));

    return result.Items?.[0] as MatchEntity || null;
  }

  async getMatchesByStatus(status: MatchStatus, limit = 20): Promise<MatchEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.MATCH_STATUS_INDEX,
      KeyConditionExpression: 'GSI2PK = :status',
      ExpressionAttributeValues: {
        ':status': `STATUS#${status}`,
      },
      ScanIndexForward: false,
      Limit: limit,
    }));

    return (result.Items || []) as MatchEntity[];
  }

  async getMatchesByDate(date: string, minScore?: number): Promise<MatchEntity[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.MATCH_DATE_INDEX,
      KeyConditionExpression: minScore
        ? 'GSI3PK = :date AND GSI3SK >= :minScore'
        : 'GSI3PK = :date',
      ExpressionAttributeValues: {
        ':date': `DATE#${date}`,
        ...(minScore && {
          ':minScore': `SCORE#${String(Math.floor(minScore)).padStart(3, '0')}`,
        }),
      },
      ScanIndexForward: false,
      Limit: 100,
    }));

    return (result.Items || []) as MatchEntity[];
  }

  async getHighScoreMatches(minScore = 80, limit = 50): Promise<MatchEntity[]> {
    const scoreRange = Math.floor(minScore / 10) * 10;
    const results: MatchEntity[] = [];

    for (let range = scoreRange; range <= 100; range += 10) {
      const result = await dynamoDBClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: GSI_NAMES.MATCH_SCORE_INDEX,
        KeyConditionExpression: 'GSI1PK = :scoreRange',
        ExpressionAttributeValues: {
          ':scoreRange': `SCORE#${String(range).padStart(3, '0')}`,
        },
        Limit: limit - results.length,
      }));

      results.push(...(result.Items || []) as MatchEntity[]);
      
      if (results.length >= limit) break;
    }

    return results.slice(0, limit);
  }

  async updateMatchStatus(
    matchId: string,
    status: MatchStatus,
    note?: string,
    userId?: string
  ): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) throw new Error('Match not found');

    const now = new Date().toISOString();
    const statusUpdate = {
      status,
      timestamp: now,
      note,
      updatedBy: userId,
    };

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: match.PK,
        SK: match.SK,
      },
      UpdateExpression: `
        SET #status = :status,
            statusHistory = list_append(statusHistory, :statusUpdate),
            GSI2PK = :newStatusKey,
            GSI2SK = :dateKey,
            updatedAt = :now
      `,
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':statusUpdate': [statusUpdate],
        ':newStatusKey': `STATUS#${status}`,
        ':dateKey': `DATE#${now}`,
        ':now': now,
      },
    }));
  }

  async updateCommunication(
    matchId: string,
    communication: Partial<MatchEntity['communication']>
  ): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) throw new Error('Match not found');

    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {
      ':now': new Date().toISOString(),
    };

    Object.entries(communication).forEach(([key, value]) => {
      updateExpressions.push(`communication.${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    });

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: match.PK,
        SK: match.SK,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}, updatedAt = :now`,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async batchCreateMatches(matches: Array<{
    storeId: string;
    storeName: string;
    creatorId: string;
    creatorName: string;
    matchResult: MatchingResult;
    userId: string;
  }>): Promise<void> {
    const now = new Date().toISOString();
    const items = matches.map(match => {
      const matchId = uuidv4();
      const scoreRange = Math.floor(match.matchResult.matchScore / 10) * 10;

      return {
        PutRequest: {
          Item: {
            PK: `MATCH#${matchId}`,
            SK: `STORE#${match.storeId}#CREATOR#${match.creatorId}`,
            GSI1PK: `SCORE#${String(scoreRange).padStart(3, '0')}`,
            GSI1SK: `MATCH#${matchId}`,
            GSI2PK: `STATUS#${MatchStatus.PENDING}`,
            GSI2SK: `DATE#${now}`,
            GSI3PK: `DATE#${now.split('T')[0]}`,
            GSI3SK: `SCORE#${String(Math.floor(match.matchResult.matchScore)).padStart(3, '0')}`,
            entityType: 'MATCH',
            matchId,
            ...match,
            matchScore: match.matchResult.matchScore,
            confidence: match.matchResult.confidence,
            status: MatchStatus.PENDING,
            statusHistory: [{
              status: MatchStatus.PENDING,
              timestamp: now,
              updatedBy: match.userId,
            }],
            communication: {
              contactAttempts: 0,
              responseReceived: false,
            },
            createdAt: now,
            updatedAt: now,
            createdBy: match.userId,
            priority: this.getPriority(match.matchResult.matchScore),
            isHot: match.matchResult.matchScore >= 80,
            ttl: Math.floor(Date.now() / 1000) + TTL_SETTINGS.MATCH_RESULTS,
          },
        },
      };
    });

    // DynamoDB BatchWrite supports max 25 items at once
    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      await dynamoDBClient.send(new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: chunk,
        },
      }));
    }
  }

  private getPriority(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }
}