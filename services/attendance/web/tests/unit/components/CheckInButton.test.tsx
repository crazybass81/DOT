import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckInButton } from '../CheckInButton';
import { AttendanceService } from '@/lib/services/attendance';

// Mock the attendance service
jest.mock('@/lib/services/attendance');

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};
global.navigator.geolocation = mockGeolocation;

describe('CheckInButton', () => {
  const mockEmployeeId = 'emp_123';
  const mockBusinessId = 'biz_456';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default geolocation mock
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 37.5547,
          longitude: 126.9707,
          accuracy: 10,
        },
      });
    });
  });

  it('should render check-in button when not checked in', () => {
    render(
      <CheckInButton 
        employeeId={mockEmployeeId}
        businessId={mockBusinessId}
        isCheckedIn={false}
      />
    );
    
    const button = screen.getByRole('button', { name: /출근하기/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should render check-out button when already checked in', () => {
    render(
      <CheckInButton 
        employeeId={mockEmployeeId}
        businessId={mockBusinessId}
        isCheckedIn={true}
      />
    );
    
    const button = screen.getByRole('button', { name: /퇴근하기/i });
    expect(button).toBeInTheDocument();
  });

  it('should request location permission on check-in', async () => {
    const mockCheckIn = jest.fn().mockResolvedValue({
      success: true,
      message: '출근 처리가 완료되었습니다',
    });
    
    (AttendanceService as any).mockImplementation(() => ({
      checkIn: mockCheckIn,
    }));

    render(
      <CheckInButton 
        employeeId={mockEmployeeId}
        businessId={mockBusinessId}
        isCheckedIn={false}
      />
    );
    
    const button = screen.getByRole('button', { name: /출근하기/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('should show loading state while processing', async () => {
    const mockCheckIn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        message: '출근 처리가 완료되었습니다',
      }), 100))
    );
    
    (AttendanceService as any).mockImplementation(() => ({
      checkIn: mockCheckIn,
    }));

    render(
      <CheckInButton 
        employeeId={mockEmployeeId}
        businessId={mockBusinessId}
        isCheckedIn={false}
      />
    );
    
    const button = screen.getByRole('button', { name: /출근하기/i });
    fireEvent.click(button);
    
    expect(screen.getByText(/처리중/i)).toBeInTheDocument();
  });

  it('should handle location permission denied', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: 'User denied Geolocation',
      });
    });

    const onError = jest.fn();
    
    render(
      <CheckInButton 
        employeeId={mockEmployeeId}
        businessId={mockBusinessId}
        isCheckedIn={false}
        onError={onError}
      />
    );
    
    const button = screen.getByRole('button', { name: /출근하기/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('위치 권한이 거부되었습니다');
    });
  });

  it('should call onSuccess callback after successful check-in', async () => {
    const mockCheckIn = jest.fn().mockResolvedValue({
      success: true,
      message: '출근 처리가 완료되었습니다',
      checkInTime: new Date(),
    });
    
    (AttendanceService as any).mockImplementation(() => ({
      checkIn: mockCheckIn,
    }));

    const onSuccess = jest.fn();
    
    render(
      <CheckInButton 
        employeeId={mockEmployeeId}
        businessId={mockBusinessId}
        isCheckedIn={false}
        onSuccess={onSuccess}
      />
    );
    
    const button = screen.getByRole('button', { name: /출근하기/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});