# Supabase Realtime Implementation for Attendance System

This directory contains the complete Supabase Realtime implementation for the DOT attendance system, providing real-time updates for attendance records and employee approvals.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Components                       │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard Components                                            │
│  ├── AttendanceStats (realtime stats)                           │
│  ├── RealtimeAttendance (realtime table)                        │
│  └── RealtimeApprovals (approval management)                    │
├─────────────────────────────────────────────────────────────────┤
│  React Hooks                                                    │
│  ├── useRealtimeAttendance                                      │
│  ├── useRealtimeApprovals                                       │
│  └── useNotifications                                           │
├─────────────────────────────────────────────────────────────────┤
│  Connection Management                                           │
│  └── RealtimeConnectionManager (singleton)                      │
├─────────────────────────────────────────────────────────────────┤
│  Notification System                                             │
│  └── NotificationSystem (toast notifications)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↕️
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Realtime                          │
├─────────────────────────────────────────────────────────────────┤
│  Database Tables                                                │
│  ├── attendance_records                                         │
│  └── employees (approval_status changes)                        │
├─────────────────────────────────────────────────────────────────┤
│  Realtime Channels                                              │
│  ├── attendance_{organizationId}                                │
│  ├── approvals_{organizationId}                                 │
│  └── notifications_{userId}                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Real-time Updates
- **Attendance Changes**: Live updates when employees check in/out
- **Approval Status**: Real-time approval/rejection notifications
- **Statistics**: Auto-updating dashboard statistics
- **Connection Status**: Visual connection state indicators

### ✅ Auto-reconnection
- **Exponential Backoff**: Smart reconnection with increasing delays
- **Connection Health**: Periodic heartbeat monitoring
- **State Management**: Maintains subscription state across reconnections
- **Error Recovery**: Graceful handling of connection failures

### ✅ Performance Optimizations
- **Debouncing**: Configurable debouncing to prevent excessive updates
- **Batching**: Efficient batching of multiple operations
- **Selective Updates**: Only update relevant components
- **Memory Management**: Proper cleanup to prevent memory leaks

### ✅ Notification System
- **Toast Notifications**: Non-intrusive popup notifications
- **Priority Levels**: High, medium, low priority with different styling
- **Sound Alerts**: Audio notifications for important events
- **Auto-dismiss**: Configurable auto-close timers
- **Action Buttons**: Interactive notifications with actions

### ✅ Developer Experience
- **TypeScript**: Full type safety throughout
- **React Hooks**: Clean, reusable hook-based architecture
- **Error Boundaries**: Comprehensive error handling
- **Logging**: Detailed logging for debugging
- **Documentation**: Extensive inline documentation

## File Structure

```
src/lib/realtime/
├── README.md                           # This file
├── realtime.ts                         # Core connection manager
├── hooks/
│   ├── useRealtimeAttendance.ts        # Attendance hook
│   └── useRealtimeApprovals.ts         # Approvals hook
├── components/
│   ├── notifications/
│   │   └── NotificationSystem.tsx      # Toast notification system
│   └── admin/
│       └── RealtimeApprovals.tsx       # Enhanced approvals component
└── types.ts                            # TypeScript type definitions
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd /home/ec2-user/DOT/services/attendance/web
npm install @supabase/supabase-js@^2.45.4
```

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

Ensure your Supabase database has the correct tables with Row Level Security (RLS):

```sql
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Add RLS policies (customize based on your auth)
CREATE POLICY "Users can view their organization's attendance" 
ON attendance_records FOR SELECT 
USING (organization_id = auth.jwt() ->> 'organization_id');

CREATE POLICY "Users can view their organization's employees" 
ON employees FOR SELECT 
USING (organization_id = auth.jwt() ->> 'organization_id');
```

### 4. Usage in Components

#### Basic Dashboard Integration

```tsx
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';
import NotificationSystem, { useNotifications } from '@/components/notifications/NotificationSystem';

function AdminDashboard() {
  const { showNotification } = useNotifications();
  const organizationId = 'your-org-id';

  const handleNotification = (notification: any) => {
    showNotification(notification);
  };

  return (
    <div>
      <AttendanceStats 
        organizationId={organizationId}
        onNotification={handleNotification}
      />
      <RealtimeAttendance 
        organizationId={organizationId}
        onNotification={handleNotification}
      />
      <NotificationSystem position="top-right" />
    </div>
  );
}
```

#### Advanced Approvals Management

```tsx
import { useRealtimeApprovals } from '@/hooks/useRealtimeApprovals';

function ApprovalsPage() {
  const {
    data,
    isConnected,
    error,
    getPendingEmployees,
    reconnect
  } = useRealtimeApprovals({
    organizationId: 'your-org-id',
    onApprovalChange: (event) => {
      console.log('Approval status changed:', event);
    }
  });

  const pendingEmployees = getPendingEmployees();

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Pending: {pendingEmployees.length}</div>
      {error && <button onClick={reconnect}>Reconnect</button>}
    </div>
  );
}
```

## Configuration Options

### RealtimeConnectionManager Options

```tsx
interface RealtimeOptions {
  debounceMs?: number;        // Debounce delay (default: 500ms)
  enableNotifications?: boolean; // Enable notifications (default: true)
  onNotification?: (notification: RealtimeNotification) => void;
  autoReconnect?: boolean;    // Auto-reconnect on failure (default: true)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
}
```

### Notification System Options

```tsx
interface NotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  defaultDuration?: number;   // Auto-close delay (default: 5000ms)
  maxNotifications?: number;  // Max visible notifications (default: 5)
  enableSounds?: boolean;     // Enable audio alerts (default: true)
}
```

## API Reference

### RealtimeConnectionManager

```tsx
class RealtimeConnectionManager {
  // Subscription methods
  subscribeToAttendance(organizationId: string, callback: Function, options?: object): string;
  subscribeToApprovals(organizationId: string, callback: Function, options?: object): string;
  subscribeToNotifications(userId: string, callback: Function): string;
  
  // Management methods
  unsubscribe(channelId: string): boolean;
  unsubscribeAll(): void;
  getConnectionState(): ConnectionState;
  getActiveChannels(): string[];
  
  // Event handling
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  
  // Notifications
  sendNotification(targetUserId: string, notification: RealtimeNotification): Promise<boolean>;
  
  // Cleanup
  cleanup(): void;
}
```

### useRealtimeAttendance Hook

```tsx
interface UseRealtimeAttendanceReturn {
  data: RealtimeAttendanceData;
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  recentEvents: AttendanceRealtimeEvent[];
  
  // Actions
  refreshData: () => void;
  clearRecentEvents: () => void;
  reconnect: () => void;
  
  // Utilities
  getEmployeeStatus: (employeeId: string) => AttendanceStatus | null;
  getTodayRecord: (employeeId: string) => AttendanceRecord | null;
}
```

### useRealtimeApprovals Hook

```tsx
interface UseRealtimeApprovalsReturn {
  data: RealtimeApprovalsData;
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  recentEvents: ApprovalEvent[];
  
  // Actions
  refreshData: () => void;
  clearRecentEvents: () => void;
  reconnect: () => void;
  
  // Utilities
  getPendingEmployees: () => Employee[];
  getEmployeesByStatus: (status: ApprovalStatus) => Employee[];
  getEmployeeById: (employeeId: string) => Employee | null;
}
```

## Troubleshooting

### Common Issues

#### 1. Connection Fails to Establish

**Symptoms**: Connection state stays "CONNECTING" or "ERROR"

**Solutions**:
- Check Supabase URL and API key configuration
- Verify network connectivity
- Check browser console for CORS errors
- Ensure Supabase project is active

#### 2. No Real-time Updates Received

**Symptoms**: Connection shows "CONNECTED" but no data updates

**Solutions**:
- Verify database tables have realtime enabled
- Check Row Level Security (RLS) policies
- Ensure user has proper permissions
- Check subscription channel names match organization ID

#### 3. Excessive Re-renders

**Symptoms**: Performance issues, React warnings about deps

**Solutions**:
- Increase debounce delay in hook options
- Use React.memo for expensive components
- Optimize re-render triggers in parent components

#### 4. Memory Leaks

**Symptoms**: Increasing memory usage over time

**Solutions**:
- Ensure proper cleanup in useEffect
- Call `unsubscribeAll()` on component unmount
- Use RealtimeConnectionManager singleton properly

### Debug Mode

Enable detailed logging:

```tsx
// In browser console
localStorage.setItem('DEBUG_REALTIME', 'true');

// Or set environment variable
NEXT_PUBLIC_DEBUG_REALTIME=true
```

### Performance Monitoring

Monitor realtime performance:

```tsx
import { realtimeManager } from '@/lib/realtime';

// Check connection health
console.log('Connection State:', realtimeManager.getConnectionState());
console.log('Active Channels:', realtimeManager.getActiveChannels());

// Monitor events
realtimeManager.on('connectionStateChange', (state) => {
  console.log('Connection changed to:', state);
});
```

## Testing

### Unit Tests

```bash
npm run test src/lib/realtime/
```

### Integration Tests

```bash
npm run test:integration realtime
```

### Manual Testing Checklist

- [ ] Connection establishes successfully
- [ ] Auto-reconnection works after network interruption
- [ ] Notifications appear for attendance changes
- [ ] Approval status changes trigger notifications
- [ ] Multiple tabs maintain independent connections
- [ ] Memory usage stays stable over extended periods
- [ ] Error states display correctly
- [ ] Connection indicators update properly

## Performance Considerations

### Optimization Strategies

1. **Debouncing**: Use appropriate debounce delays for different event types
2. **Selective Subscriptions**: Only subscribe to relevant organization data
3. **Memory Management**: Proper cleanup of subscriptions and event listeners
4. **Batch Processing**: Group multiple updates when possible
5. **Connection Pooling**: Reuse connections across components

### Scalability

- **Single Connection**: Uses one WebSocket connection for all subscriptions
- **Channel Multiplexing**: Multiple channels over single connection
- **Load Balancing**: Supabase handles backend load balancing
- **Rate Limiting**: Built-in rate limiting prevents abuse

## Security

### Data Protection

- **Row Level Security**: All data access controlled by RLS policies
- **Authentication**: JWT-based authentication required
- **Organization Isolation**: Data scoped to user's organization
- **Input Validation**: All inputs validated and sanitized

### Best Practices

1. Always use organization-scoped subscriptions
2. Implement proper RLS policies in Supabase
3. Validate user permissions before showing data
4. Use HTTPS for all connections
5. Log security-relevant events

## Contributing

### Adding New Realtime Features

1. Define TypeScript interfaces for data structures
2. Add subscription methods to RealtimeConnectionManager
3. Create corresponding React hooks
4. Add comprehensive error handling
5. Include unit tests and documentation
6. Update this README

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Include error handling for all async operations
- Use React hooks patterns consistently

## License

This implementation is part of the DOT attendance system and follows the project's licensing terms.