/**
 * Analysis Results Storage
 * MVP: In-memory storage, should be replaced with database in production
 */

export interface AnalysisResult {
  analysisId: string;
  storeProfile: {
    name: string;
    category: string;
    location: {
      fullAddress: string;
      city: string;
      district: string;
      neighborhood?: string;
    };
    priceLevel: string;
    keywords: {
      menu: string[];
      experience: string[];
      hashtags: string[];
    };
    sentiment: {
      overall: string;
      score: number;
      aspects: Record<string, number>;
    };
  };
  creatorMatches: Array<{
    channelId: string;
    channelName: string;
    subscriberCount: number;
    category: string;
    location?: string;
    matchScore: number;
    matchReasons: string[];
    engagementScore: number;
    recentPerformance: {
      avgViews: number;
      avgEngagement: number;
      uploadFrequency: number;
    };
  }>;
  summary: {
    totalMatches: number;
    avgMatchScore: number;
    topCategories: string[];
  };
  processingTime: number;
  analyzedAt: string;
}

// Global in-memory storage
const analysisResults = new Map<string, AnalysisResult>();

// Auto-cleanup old results (older than 24 hours)
const RESULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  for (const [id, result] of analysisResults.entries()) {
    const resultAge = now - new Date(result.analyzedAt).getTime();
    if (resultAge > RESULT_TTL) {
      analysisResults.delete(id);
      console.log(`🧹 Cleaned up old analysis result: ${id}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

export class AnalysisStorage {
  /**
   * Store analysis result
   */
  static store(result: AnalysisResult): void {
    analysisResults.set(result.analysisId, result);
    console.log(`💾 Stored analysis result: ${result.analysisId}`);
  }

  /**
   * Retrieve analysis result
   */
  static get(analysisId: string): AnalysisResult | null {
    return analysisResults.get(analysisId) || null;
  }

  /**
   * Check if analysis exists
   */
  static has(analysisId: string): boolean {
    return analysisResults.has(analysisId);
  }

  /**
   * Delete analysis result
   */
  static delete(analysisId: string): boolean {
    return analysisResults.delete(analysisId);
  }

  /**
   * Get all analysis IDs
   */
  static getAllIds(): string[] {
    return Array.from(analysisResults.keys());
  }

  /**
   * Get storage stats
   */
  static getStats(): {
    totalResults: number;
    oldestResult?: string;
    newestResult?: string;
  } {
    const ids = Array.from(analysisResults.keys());
    const results = Array.from(analysisResults.values());
    
    if (results.length === 0) {
      return { totalResults: 0 };
    }

    const sortedResults = results.sort((a, b) => 
      new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime()
    );

    return {
      totalResults: results.length,
      oldestResult: sortedResults[0]?.analyzedAt,
      newestResult: sortedResults[sortedResults.length - 1]?.analyzedAt
    };
  }

  /**
   * Clear all results (for testing)
   */
  static clear(): void {
    analysisResults.clear();
    console.log('🧹 Cleared all analysis results');
  }
}
