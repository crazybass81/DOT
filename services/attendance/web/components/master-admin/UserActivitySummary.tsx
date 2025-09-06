/ui UserActivitySummary card component with key metrics

Create a compact summary card showing key user management metrics with the following features:

**Component Props:**
```typescript
interface UserActivitySummaryProps {
  totalUsers: number;
  loading?: boolean;
  className?: string;
}
```

**Summary Metrics:**
1. **Total Users Count** - Main large number display
2. **Active Users Today** - Users who logged in today
3. **New Registrations** - Users registered in last 7 days
4. **Pending Approvals** - Users waiting for organization approval
5. **System Health** - Overall user system status

**Design Requirements:**

1. **Layout:**
   - Compact horizontal card design
   - Clean, professional appearance
   - Subtle background and borders
   - Responsive layout for mobile

2. **Metrics Display:**
   - Large prominent numbers
   - Clear metric labels
   - Trend indicators (up/down arrows)
   - Color-coded status indicators
   - Percentage changes where applicable

3. **Visual Elements:**
   - Icons for each metric type
   - Progress indicators for percentages
   - Status dots/badges
   - Subtle animations on data updates
   - Loading shimmer effects

4. **Interactive Features:**
   - Hover effects revealing more details
   - Clickable metrics for drill-down
   - Tooltip with additional information
   - Auto-refresh capability

5. **Status Indicators:**
   - Green: Healthy metrics
   - Yellow: Warning levels
   - Red: Critical attention needed
   - Gray: No data or loading

**Metric Icons:**
- 👥 Total Users
- ✅ Active Today
- 🆕 New Registrations
- ⏳ Pending Approvals
- 🔧 System Health

**Sample Data Structure:**
```typescript
interface SystemMetrics {
  totalUsers: number;
  activeToday: number;
  newRegistrations: number;
  pendingApprovals: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  trends: {
    totalUsersChange: number; // percentage
    activeChange: number;
    registrationChange: number;
  };
}
```

**Loading States:**
- Skeleton placeholders for numbers
- Shimmer animation effects
- Progressive data loading
- Graceful error handling

**Responsive Behavior:**
- Desktop: Horizontal layout with all metrics
- Tablet: 2x2 grid layout
- Mobile: Vertical stack with priority metrics

**Error Handling:**
- Network error states
- Missing data handling
- Fallback to cached data
- User-friendly error messages

**Accessibility:**
- Screen reader support
- Keyboard navigation
- High contrast support
- Proper ARIA labels
- Meaningful alt texts

**Test IDs:**
- `user-activity-summary` - Main container
- `metric-total-users` - Total users metric
- `metric-active-today` - Active users metric
- `metric-new-registrations` - New registrations metric
- `metric-pending-approvals` - Pending approvals metric
- `system-health-indicator` - Health status indicator
- `summary-loading-skeleton` - Loading state

**Visual Design:**
- Modern card design with subtle shadows
- Clean typography hierarchy
- Consistent spacing and alignment
- Professional color scheme
- Smooth micro-interactions

Use TypeScript, Tailwind CSS, and modern React patterns. Ensure the component is performant and accessible.