# QR Code Deep Link Test URLs

## Test Deep Links for QR Login

### 1. Using Custom Scheme (Recommended for Mobile)
```
dotattendance://login?token=TEST123456&action=login
```

### 2. Using HTTPS URL
```
https://attendance.dot.com/qr?token=TEST123456&action=login
```

### 3. Using HTTP URL (Development)
```
http://attendance.dot.com/qr?token=TEST123456&action=login
```

### 4. Simple Test URL (Most Compatible)
```
dotattendance://login?token=TEST123456
```

## How to Test

1. Generate a QR code with one of the above URLs
2. Scan the QR code with your phone's camera
3. The app should open and automatically log in the user
4. User should be redirected to their dashboard

## Online QR Code Generators

You can use these services to generate test QR codes:
- https://www.qr-code-generator.com/
- https://www.qrcode-monkey.com/
- https://www.the-qrcode-generator.com/

Just paste one of the URLs above and generate the QR code.

## Testing with ADB (Android Debug Bridge)

You can also test deep links directly using ADB:

```bash
# Test with custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "dot-attendance://qr-login?token=TEST123456&action=login" com.dot.attendance

# Test with HTTPS URL
adb shell am start -W -a android.intent.action.VIEW -d "https://attendance.dot.com/qr-login?token=TEST123456&action=login" com.dot.attendance
```

## Expected Behavior

When the deep link is triggered:
1. The app should open (or come to foreground if already running)
2. The deep link handler in main.dart should parse the token
3. AuthProvider.loginWithQrToken() should be called
4. User should be logged in automatically
5. Router should redirect to the appropriate dashboard based on user role