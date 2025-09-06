/ui UserSearchFilters with advanced filtering options

Create a comprehensive search and filter component for user management with the following features:

**Filter Types:**
1. **Text Search:**
   - Real-time search input
   - Search by name, email, phone
   - Search suggestions dropdown
   - Search history (last 10 searches)
   - Clear search functionality

2. **Role Filter:**
   - EMPLOYEE, MANAGER, ADMIN, MASTER_ADMIN
   - Single selection dropdown
   - Role icons/badges
   - Clear role filter option

3. **Status Filter:**
   - ACTIVE, INACTIVE, SUSPENDED
   - Multi-select checkboxes
   - Status color indicators
   - Select all/none options

4. **Organization Filter:**
   - Organization dropdown with search
   - Show organization status
   - Multi-select support
   - Recently used organizations

5. **Date Filters:**
   - Date range picker for join date
   - Last login date range
   - Preset ranges (Today, Week, Month, Year)
   - Custom date range validation

6. **Advanced Filters:**
   - Email verified status
   - Phone verified status
   - Two-factor authentication enabled
   - Has profile image
   - Active in specific timeframe

**Component Interface:**
```typescript
interface SearchFilters {
  role?: string;
  status?: string[];
  organizationId?: string[];
  startDate?: string;
  endDate?: string;
  lastLogin?: 'TODAY' | 'WEEK' | 'MONTH' | 'NEVER';
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  hasProfileImage?: boolean;
}

interface UserSearchFiltersProps {
  onSearch?: (query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  loading?: boolean;
  totalResults?: number;
}
```

**Required Features:**

1. **Search Input:**
   - Debounced input (300ms)
   - Search icon and clear button
   - Placeholder text: "사용자 검색 (이름, 이메일, 전화번호)"
   - Loading spinner when searching
   - Search suggestions dropdown

2. **Filter Layout:**
   - Expandable filter panel
   - Quick filters row (common filters)
   - Advanced filters collapsible section
   - Filter chips showing active filters
   - Clear all filters button

3. **Filter Controls:**
   - Dropdown menus for single select
   - Checkbox groups for multi-select
   - Date pickers with validation
   - Toggle switches for boolean filters
   - Proper form validation

4. **Interactive Features:**
   - Filter count indicators
   - Active filter badges
   - Quick clear individual filters
   - Expand/collapse advanced options
   - Filter presets/saved searches

5. **Error Handling:**
   - Invalid date range validation
   - Network errors for organization loading
   - Filter conflict detection
   - User-friendly error messages

6. **Performance:**
   - Debounced search input
   - Lazy loading of organization options
   - Optimized re-renders
   - Cancel previous requests

7. **Accessibility:**
   - Keyboard navigation
   - Screen reader support
   - Focus management
   - ARIA labels

**Visual Design:**
- Clean, modern interface
- Proper spacing and typography
- Color-coded filter indicators
- Responsive layout
- Loading states
- Clear visual hierarchy

**Test IDs:**
- `user-search-input` - Main search input
- `role-filter-select` - Role dropdown
- `status-filter-checkboxes` - Status checkboxes
- `organization-filter-select` - Organization dropdown
- `date-range-picker` - Date range inputs
- `clear-filters-button` - Clear all button
- `active-filters-chips` - Filter badge container
- `advanced-filters-toggle` - Expand/collapse button

Use modern React patterns, TypeScript, Tailwind CSS, and proper form handling.