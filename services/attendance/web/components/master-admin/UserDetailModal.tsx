/ui UserDetailModal with comprehensive user information

Create a detailed modal for displaying comprehensive user information with the following features:

**User Data Structure:**
```typescript
interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  timezone: string | null;
  locale: string | null;
}

interface ActivityStats {
  totalWorkDays: number;
  averageWorkHours: number;
  attendanceRate: number;
  punctualityRate: number;
  lastAttendance: string | null;
  thisMonth: {
    workDays: number;
    workHours: number;
    attendanceRate: number;
  };
  totalLogins: number;
  lastLoginDate: string | null;
  organizationsCount: number;
  activeOrganizations: number;
}

interface OrganizationMembership {
  id: string;
  name: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
  status: string;
  joined_at: string;
  organization_status: string;
}
```

**Component Props:**
```typescript
interface UserDetailModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
```

**Modal Sections:**

1. **Header Section:**
   - User profile image (120px avatar with fallback)
   - Full name and email
   - Status badge (ACTIVE/INACTIVE/SUSPENDED)
   - Verification indicators (email, phone, 2FA)
   - Close button (X)

2. **Basic Information Tab:**
   - Contact information (email, phone)
   - Account details (created date, last login)
   - Settings (timezone, locale)
   - Verification status indicators
   - Security settings (2FA enabled)

3. **Organizations Tab:**
   - List of organization memberships
   - Role badges for each organization
   - Organization status indicators
   - Join dates and approval information
   - Inactive/deleted organization handling

4. **Activity Statistics Tab:**
   - Work statistics (attendance rate, work days, hours)
   - Login statistics (total logins, last login)
   - Performance metrics (punctuality rate)
   - Monthly comparisons (this month vs last month)
   - Visual progress bars and charts

5. **Recent Activity Tab:**
   - Timeline of recent user actions
   - Activity type icons
   - Timestamps (relative and absolute)
   - IP addresses and user agents
   - Filterable activity types

**Required Features:**

1. **Modal Behavior:**
   - Full-screen overlay with backdrop
   - Smooth open/close animations
   - Keyboard navigation (ESC to close)
   - Click outside to close
   - Focus management and trapping

2. **Tab Navigation:**
   - Tab header with icons
   - Active tab indicators
   - Keyboard accessible tabs
   - Tab content lazy loading
   - Tab badges with counts

3. **Loading States:**
   - Full modal skeleton while loading user
   - Individual section loading spinners
   - Progressive data loading
   - Partial data warnings
   - Loading skeleton for each tab

4. **Error Handling:**
   - User not found state
   - Network error handling
   - Access denied messages
   - Partial data load failures
   - Retry mechanisms

5. **Data Display:**
   - Formatted dates and times
   - Progress bars for statistics
   - Status badges with colors
   - Organization chips/badges
   - Activity timeline components

6. **Interactive Elements:**
   - Refresh data buttons
   - Copy to clipboard features
   - Export user data option
   - Quick actions menu
   - Link to organization pages

7. **Responsive Design:**
   - Mobile-friendly layout
   - Adaptive modal sizing
   - Collapsible sections on mobile
   - Touch-friendly interactions
   - Proper viewport handling

**Error States:**
- User not found (404)
- Access denied (403)
- Network errors
- Partial data loading failures
- Deleted user handling

**Test IDs:**
- `user-detail-modal` - Main modal container
- `user-detail-skeleton` - Loading skeleton
- `modal-loading-spinner` - Loading indicator
- `user-not-found-illustration` - 404 state
- `access-denied-icon` - 403 state
- `activity-stats-section` - Statistics section
- `activity-stats-placeholder` - Stats loading state
- `organization-error-state` - Org loading error
- `default-profile-avatar` - Default avatar

**Accessibility:**
- ARIA modal attributes
- Focus management
- Keyboard navigation
- Screen reader support
- Proper headings hierarchy
- Color contrast compliance

Use modern React patterns, TypeScript, Tailwind CSS, and proper modal accessibility practices. Include smooth animations and professional styling.