/ui UserDataGrid with virtualized scrolling for 10k+ users

Create a virtualized data grid for displaying users with the following features:

**Data Structure:**
```typescript
interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  profile_image: string | null;
  created_at: string;
  last_login: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  organizations: Array<{
    id: string;
    name: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
  }>;
}
```

**Component Props:**
```typescript
interface UserDataGridProps {
  users: User[];
  totalCount: number;
  loading: boolean;
  hasNextPage: boolean;
  onUserSelect: (userId: string) => void;
  onLoadMore: () => Promise<void>;
}
```

**Required Features:**

1. **Virtualized Scrolling:**
   - Handle 10,000+ users efficiently
   - Fixed row height (72px)
   - Smooth scrolling performance
   - Memory usage optimization

2. **Column Layout:**
   - Profile image (48px avatar)
   - Name & Email (primary info)
   - Phone number
   - Organizations (chips/badges)
   - Status badge
   - Last login (relative time)
   - Actions (view details button)

3. **Interactive Elements:**
   - Row click to select user
   - Hover effects
   - Status badges with appropriate colors
   - Organization role badges
   - Loading states for infinite scroll

4. **Performance Features:**
   - Infinite scroll with loading indicator
   - Error handling for load failures
   - Retry mechanism
   - Performance warnings for large datasets
   - Memory usage monitoring

5. **Accessibility:**
   - Keyboard navigation
   - Screen reader support
   - Focus management
   - ARIA labels and roles

6. **Visual Design:**
   - Clean table layout
   - Responsive design
   - Loading skeletons
   - Error states
   - Empty states
   - Status indicators

7. **Error Handling:**
   - Network errors
   - Loading failures
   - Memory warnings
   - Performance degradation alerts

**Test IDs for Testing:**
- `user-data-grid` - Main container
- `user-row-{userId}` - Individual user rows
- `virtualized-list` - Virtual scroll container
- `infinite-scroll-loading` - Loading indicator
- `load-more-error` - Error state
- `performance-warning` - Performance alerts
- `user-list-skeleton` - Loading skeleton

Use modern React patterns, TypeScript, and Tailwind CSS. Implement proper error boundaries and performance optimizations.