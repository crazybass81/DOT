#!/usr/bin/env node
/**
 * Initial Organization Setup Script for ID-ROLE-PAPER System
 * Creates the first organization with a FRANCHISOR admin user
 * 
 * Usage:
 * node scripts/setup-initial-organization.js --email admin@example.com --name "DOT Restaurant Group"
 */

const { createClient } = require('@supabase/supabase-js');
const { Command } = require('commander');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const program = new Command();

program
  .name('setup-initial-organization')
  .description('Create the first organization with a FRANCHISOR admin user')
  .requiredOption('-e, --email <email>', 'Admin user email')
  .requiredOption('-n, --name <name>', 'Organization name')
  .option('-p, --password <password>', 'Admin user password (will prompt if not provided)')
  .option('-t, --type <type>', 'Organization type', 'restaurant')
  .option('--dry-run', 'Show what would be done without making changes')
  .parse();

const options = program.opts();

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupInitialOrganization() {
  console.log('🚀 Setting up initial organization for ID-ROLE-PAPER System\n');
  
  try {
    // Step 1: Check if organizations already exist
    console.log('1️⃣  Checking existing organizations...');
    const { data: existingOrgs, error: orgCheckError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgCheckError) {
      throw new Error(`Failed to check existing organizations: ${orgCheckError.message}`);
    }

    if (existingOrgs && existingOrgs.length > 0) {
      console.log('⚠️  Organizations already exist:');
      existingOrgs.forEach(org => console.log(`   - ${org.name} (${org.id})`));
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        rl.question('Do you want to continue anyway? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }

    // Step 2: Get admin password if not provided
    let adminPassword = options.password;
    if (!adminPassword) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      adminPassword = await new Promise((resolve) => {
        rl.question('Enter admin password (min 8 chars): ', resolve);
      });
      rl.close();
      
      if (adminPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
    }

    if (options.dryRun) {
      console.log('\n🧪 DRY RUN - Would perform the following actions:');
      console.log(`   📧 Create user: ${options.email}`);
      console.log(`   🏢 Create organization: ${options.name} (${options.type})`);
      console.log(`   👤 Create FRANCHISOR identity for admin`);
      console.log(`   🔐 Grant FRANCHISOR role`);
      console.log(`   ✅ Setup complete\n`);
      return;
    }

    // Step 3: Create admin user account
    console.log('2️⃣  Creating admin user account...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: options.email,
      password: adminPassword,
      email_confirm: true
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    console.log(`   ✅ Created user: ${authUser.user.email} (${authUser.user.id})`);

    // Step 4: Create organization
    console.log('3️⃣  Creating organization...');
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: options.name,
        type: options.type,
        settings: {
          created_by: 'setup-script',
          setup_date: new Date().toISOString(),
          features: {
            identity_management: true,
            business_registration: true,
            paper_management: true,
            permission_dashboard: true
          }
        }
      })
      .select()
      .single();

    if (orgError) {
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }

    console.log(`   ✅ Created organization: ${organization.name} (${organization.id})`);

    // Step 5: Create admin identity
    console.log('4️⃣  Creating admin identity...');
    const { data: identity, error: identityError } = await supabase
      .from('identities')
      .insert({
        organization_id: organization.id,
        user_id: authUser.user.id,
        identity_type: 'personal',
        full_name: 'System Administrator',
        personal_info: {
          phone: '010-0000-0000',
          address: 'System Admin Address',
          role: 'administrator'
        }
      })
      .select()
      .single();

    if (identityError) {
      throw new Error(`Failed to create identity: ${identityError.message}`);
    }

    console.log(`   ✅ Created identity: ${identity.full_name} (${identity.id})`);

    // Step 6: Grant FRANCHISOR role
    console.log('5️⃣  Granting FRANCHISOR role...');
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        organization_id: organization.id,
        identity_id: identity.id,
        role_type: 'FRANCHISOR',
        granted_by: identity.id, // Self-granted for initial setup
        granted_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (roleError) {
      throw new Error(`Failed to grant role: ${roleError.message}`);
    }

    console.log(`   ✅ Granted role: ${role.role_type}`);

    // Step 7: Update default permissions with actual organization ID
    console.log('6️⃣  Setting up organization permissions...');
    const { error: permissionError } = await supabase.rpc('create_default_permissions_for_organization', {
      org_id: organization.id
    });

    if (permissionError) {
      console.warn(`   ⚠️  Permission setup warning: ${permissionError.message}`);
    } else {
      console.log(`   ✅ Configured role-based permissions`);
    }

    // Step 8: Provide completion summary
    console.log('\n🎉 Initial organization setup complete!\n');
    console.log('📋 Setup Summary:');
    console.log(`   🏢 Organization: ${organization.name} (${organization.id})`);
    console.log(`   👤 Admin User: ${authUser.user.email}`);
    console.log(`   🔐 Role: FRANCHISOR (System Administrator)`);
    console.log(`   🌐 Login URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}\n`);
    
    console.log('🚀 Next Steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Navigate to the login page');
    console.log('   3. Sign in with the admin credentials');
    console.log('   4. Begin creating additional identities and businesses\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupInitialOrganization();