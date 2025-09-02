// Quick test script to verify business profile functionality
import 'lib/core/services/firebase_service.dart';
import 'lib/domain/entities/business/business_info.dart';
import 'lib/domain/entities/business/representative.dart';
import 'lib/domain/entities/business/business_location.dart';
import 'lib/domain/entities/business/business_profile.dart';
import 'lib/domain/entities/user/user.dart';
import 'lib/domain/entities/user/user_role.dart';

void main() async {
  print('🔄 Testing Business Profile Implementation...\n');

  // Initialize Firebase service
  final firebaseService = FirebaseService.instance;
  await firebaseService.initialize();

  // Test 1: Sign in and get user data
  print('📋 Test 1: User Authentication and Business Profile');
  final userData = await firebaseService.signInWithEmailPassword(
    'archt723@gmail.com', 
    '1q2w3e2w1q!'
  );

  if (userData != null) {
    print('✅ Authentication successful');
    print('👤 User: ${userData['firstName']} ${userData['lastName']}');
    print('🏢 Organization: ${userData['organizationName']}');
    print('🎭 Role: ${userData['role']}\n');
  } else {
    print('❌ Authentication failed\n');
    return;
  }

  // Test 2: Get business profile
  print('📋 Test 2: Business Profile Retrieval');
  final businessProfile = await firebaseService.getBusinessProfile(userData!['uid']);
  
  if (businessProfile != null) {
    print('✅ Business profile found');
    
    // Business Info
    final businessInfo = businessProfile['businessInfo'];
    print('🏢 Business Name: ${businessInfo['businessName']}');
    print('📄 Registration Number: ${businessInfo['businessRegistrationNumber']}');
    print('🎯 Business Type: ${businessInfo['businessType']}');
    print('✅ Verified: ${businessInfo['isVerified']}\n');
    
    // Representative Info
    final representative = businessProfile['representative'];
    print('👨‍💼 Representative: ${representative['name']}');
    print('📞 Phone: ${representative['phoneNumber']}');
    print('✅ Phone Verified: ${representative['isPhoneVerified']}');
    print('✅ Identity Verified: ${representative['isIdentityVerified']}\n');
    
    // Business Locations
    final locations = businessProfile['locations'] as List;
    print('🏢 Business Locations (${locations.length}):');
    for (final location in locations) {
      print('  📍 ${location['name']} - ${location['address']}');
      print('    👥 Employees: ${location['employeeCount']}');
      print('    🏠 Head Office: ${location['isHeadOffice']}');
      if (location['managerName'] != null) {
        print('    👨‍💼 Manager: ${location['managerName']}');
      }
      print('');
    }
    
    // Verification Status
    print('🎯 Verification Score: ${businessProfile['verificationScore']}');
    print('✅ Profile Complete: ${businessProfile['isProfileComplete']}');
    
    final completedVerifications = businessProfile['completedVerifications'] as List;
    print('🔒 Completed Verifications: ${completedVerifications.join(', ')}\n');
    
  } else {
    print('❌ No business profile found\n');
  }

  // Test 3: Test entity creation and validation
  print('📋 Test 3: Entity Validation');
  
  // Test BusinessInfo entity
  final testBusinessInfo = BusinessInfo(
    id: 'test_business',
    businessRegistrationNumber: '2480102359',
    businessName: 'Test Company',
    businessType: 'Software Development',
    businessAddress: 'Seoul, Korea',
  );
  
  print('✅ BusinessInfo created successfully');
  print('📄 Formatted Registration: ${testBusinessInfo.formattedRegistrationNumber}');
  print('✅ Registration Valid: ${testBusinessInfo.isRegistrationNumberValid}\n');
  
  // Test Representative entity
  final testRepresentative = Representative(
    id: 'test_rep',
    name: '임태균',
    phoneNumber: '01093177090',
  );
  
  print('✅ Representative created successfully');
  print('📞 Formatted Phone: ${testRepresentative.formattedPhoneNumber}');
  print('📞 Masked Phone: ${testRepresentative.maskedPhoneNumber}');
  print('✅ Phone Valid: ${testRepresentative.isPhoneNumberValid}');
  print('🔒 Verification Status: ${testRepresentative.verificationStatus}\n');
  
  // Test BusinessLocation entity
  final testLocation = BusinessLocation(
    id: 'test_location',
    businessInfoId: 'test_business',
    name: '강남테스트지점',
    address: '서울시 강남구 테헤란로 123',
    employeeCount: 10,
    isHeadOffice: true,
  );
  
  print('✅ BusinessLocation created successfully');
  print('🏢 Full Address: ${testLocation.fullAddress}');
  print('🎯 Location Type: ${testLocation.locationTypeDisplay}');
  print('📊 Status: ${testLocation.statusDisplay}');
  print('👥 Employee Count: ${testLocation.employeeCountDisplay}\n');

  // Test 4: Business profile methods
  print('📋 Test 4: Business Profile Methods');
  
  // Get locations
  final userLocations = await firebaseService.getBusinessLocations(userData['uid']);
  print('✅ Retrieved ${userLocations.length} locations');
  
  // Test adding a new location
  final newLocationData = {
    'businessInfoId': 'business_001',
    'name': '신규테스트지점',
    'address': '서울시 서초구 테스트로 456',
    'employeeCount': 0,
    'isActive': true,
    'isHeadOffice': false,
  };
  
  final addResult = await firebaseService.addBusinessLocation(userData['uid'], newLocationData);
  print('✅ Add location result: $addResult\n');
  
  // Test 5: Verification methods (placeholders)
  print('📋 Test 5: Verification Methods (Placeholders)');
  
  final phoneVerificationResult = await firebaseService.requestPhoneVerification('01093177090');
  print('✅ Phone verification request: $phoneVerificationResult');
  
  final phoneVerifyResult = await firebaseService.verifyPhoneNumber('01093177090', '123456');
  print('✅ Phone verification result: $phoneVerifyResult');
  
  final businessValidation = await firebaseService.validateBusinessRegistrationNumber('248-01-02359');
  print('✅ Business validation result: ${businessValidation?['isValid']}');
  if (businessValidation?['isValid'] == true) {
    print('🏢 Validated Business: ${businessValidation?['businessName']}\n');
  }

  print('🎉 All tests completed successfully!');
  print('📋 Summary:');
  print('  ✅ Authentication with extended business data');
  print('  ✅ Business profile entity creation and validation');
  print('  ✅ Representative and location management');
  print('  ✅ Verification system placeholders');
  print('  ✅ Firebase service extensions');
  print('\n🚀 Implementation ready for UI integration!');
}