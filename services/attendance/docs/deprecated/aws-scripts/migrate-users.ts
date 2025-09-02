#!/usr/bin/env ts-node

/**
 * User Migration Script
 * Migrates users from AWS Cognito to Supabase Auth
 */

import { migrationService } from '../src/services/migrationService';
import { supabase } from '../src/lib/supabase-config';
import { createClient } from '@supabase/supabase-js';

interface MigrationConfig {
  batchSize: number;
  delayBetweenBatches: number; // milliseconds
  dryRun: boolean;
  targetUsers?: string[]; // specific emails to migrate
}

interface CognitoUser {
  email: string;
  name?: string;
  phone?: string;
  employeeCode?: string;
  // Add temporary password for migration
  tempPassword?: string;
}

class UserMigrationScript {
  private config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  /**
   * Main migration execution
   */
  async run(): Promise<void> {
    console.log('🚀 Starting user migration from Cognito to Supabase');
    console.log(`Configuration:`, this.config);

    if (this.config.dryRun) {
      console.log('🟡 DRY RUN MODE - No actual changes will be made');
    }

    try {
      // Step 1: Get migration candidates
      const users = await this.getMigrationCandidates();
      console.log(`📊 Found ${users.length} users to migrate`);

      if (users.length === 0) {
        console.log('✅ No users need migration');
        return;
      }

      // Step 2: Show migration plan
      await this.showMigrationPlan(users);

      if (this.config.dryRun) {
        console.log('✅ Dry run completed');
        return;
      }

      // Step 3: Execute migration in batches
      const results = await this.executeBatchMigration(users);
      
      // Step 4: Show results
      this.showResults(results);

      console.log('✅ Migration completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  /**
   * Get users that need migration
   */
  private async getMigrationCandidates(): Promise<CognitoUser[]> {
    if (this.config.targetUsers && this.config.targetUsers.length > 0) {
      // Get specific users
      return this.getSpecificUsers(this.config.targetUsers);
    }

    // Get all unmigrated users from database
    const { data: employees, error } = await supabase
      .from('employees')
      .select('email, name, phone, employee_code, auth_user_id')
      .is('auth_user_id', null)
      .not('email', 'is', null);

    if (error) {
      throw new Error(`Failed to get migration candidates: ${error.message}`);
    }

    return employees.map(emp => ({
      email: emp.email,
      name: emp.name,
      phone: emp.phone,
      employeeCode: emp.employee_code,
      // Note: In production, you'd need to handle password migration differently
      // This is a simplified example
      tempPassword: this.generateTempPassword()
    }));
  }

  /**
   * Get specific users for targeted migration
   */
  private async getSpecificUsers(emails: string[]): Promise<CognitoUser[]> {
    const users: CognitoUser[] = [];

    for (const email of emails) {
      const { data: employee } = await supabase
        .from('employees')
        .select('email, name, phone, employee_code, auth_user_id')
        .eq('email', email)
        .single();

      if (employee && !employee.auth_user_id) {
        users.push({
          email: employee.email,
          name: employee.name,
          phone: employee.phone,
          employeeCode: employee.employee_code,
          tempPassword: this.generateTempPassword()
        });
      }
    }

    return users;
  }

  /**
   * Show migration plan
   */
  private async showMigrationPlan(users: CognitoUser[]): Promise<void> {
    console.log('\n📋 Migration Plan:');
    console.log(`• Total users: ${users.length}`);
    console.log(`• Batch size: ${this.config.batchSize}`);
    console.log(`• Number of batches: ${Math.ceil(users.length / this.config.batchSize)}`);
    console.log(`• Delay between batches: ${this.config.delayBetweenBatches}ms`);
    
    console.log('\n👥 Users to migrate:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.name || 'No name'})`);
    });

    if (!this.config.dryRun) {
      console.log('\n⚠️  This will create Supabase accounts for these users');
      console.log('   Users will need to verify their email addresses');
      console.log('   Continue? (Press Ctrl+C to cancel)\n');
      
      // Wait for user confirmation in production
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  /**
   * Execute migration in batches
   */
  private async executeBatchMigration(users: CognitoUser[]): Promise<any> {
    const batchResults = {
      successful: [] as string[],
      failed: [] as Array<{ email: string; error: string }>,
      needsVerification: [] as string[]
    };

    const batches = this.chunkArray(users, this.config.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} users)`);

      const batchData = batch.map(user => ({
        email: user.email,
        password: user.tempPassword || this.generateTempPassword(),
        additionalData: {
          name: user.name,
          phone: user.phone,
          employeeCode: user.employeeCode
        }
      }));

      const result = await migrationService.batchMigrate(batchData);
      
      // Merge results
      batchResults.successful.push(...result.successful);
      batchResults.failed.push(...result.failed);
      batchResults.needsVerification.push(...result.needsVerification);

      console.log(`✅ Batch ${i + 1} completed:`);
      console.log(`   • Successful: ${result.successful.length}`);
      console.log(`   • Failed: ${result.failed.length}`);
      console.log(`   • Needs verification: ${result.needsVerification.length}`);

      // Wait between batches to avoid rate limiting
      if (i < batches.length - 1) {
        console.log(`⏳ Waiting ${this.config.delayBetweenBatches}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
      }
    }

    return batchResults;
  }

  /**
   * Show migration results
   */
  private showResults(results: any): void {
    console.log('\n📊 Migration Results:');
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`📧 Needs verification: ${results.needsVerification.length}`);

    if (results.failed.length > 0) {
      console.log('\n❌ Failed migrations:');
      results.failed.forEach((failure: any) => {
        console.log(`   • ${failure.email}: ${failure.error}`);
      });
    }

    if (results.needsVerification.length > 0) {
      console.log('\n📧 Users needing email verification:');
      results.needsVerification.forEach((email: string) => {
        console.log(`   • ${email}`);
      });
      console.log('\n   These users will receive verification emails');
      console.log('   They need to verify before they can log in');
    }
  }

  /**
   * Utility methods
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private generateTempPassword(): string {
    // Generate a temporary password that meets security requirements
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase  
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // special

    // Fill the rest to reach 12 characters
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get migration statistics
   */
  async getStats(): Promise<void> {
    const stats = await migrationService.getMigrationStats();
    console.log('\n📊 Migration Statistics:');
    console.log(`• Total employees: ${stats.totalEmployees}`);
    console.log(`• Migrated: ${stats.migratedEmployees}`);
    console.log(`• Pending migration: ${stats.pendingMigration}`);
    console.log(`• Progress: ${stats.migrationProgress.toFixed(1)}%`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'stats') {
    const script = new UserMigrationScript({ batchSize: 0, delayBetweenBatches: 0, dryRun: true });
    await script.getStats();
    return;
  }

  const config: MigrationConfig = {
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '5'),
    delayBetweenBatches: parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '2000'),
    dryRun: args.includes('--dry-run'),
    targetUsers: args.find(arg => arg.startsWith('--users='))?.split('=')[1]?.split(',')
  };

  const script = new UserMigrationScript(config);
  await script.run();
}

// Execute if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { UserMigrationScript };