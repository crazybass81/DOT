import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreatorSearch from '../CreatorSearch';

describe('CreatorSearch Component', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all search fields', () => {
    render(<CreatorSearch onSearch={mockOnSearch} />);
    
    expect(screen.getByLabelText(/검색어/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/카테고리/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/지역/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/최소 구독자/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/최대 구독자/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /검색하기/i })).toBeInTheDocument();
  });

  it('calls onSearch with correct filters when search button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreatorSearch onSearch={mockOnSearch} />);
    
    // Fill in search fields
    const keywordInput = screen.getByPlaceholderText(/채널명, 키워드 등/i);
    await user.type(keywordInput, '먹방');
    
    const categorySelect = screen.getByLabelText(/카테고리/i);
    await user.selectOptions(categorySelect, '음식');
    
    const locationSelect = screen.getByLabelText(/지역/i);
    await user.selectOptions(locationSelect, '서울');
    
    const minSubscribersInput = screen.getByPlaceholderText('1000');
    await user.type(minSubscribersInput, '5000');
    
    const maxSubscribersInput = screen.getByPlaceholderText('1000000');
    await user.type(maxSubscribersInput, '100000');
    
    // Click search button
    const searchButton = screen.getByRole('button', { name: /검색하기/i });
    await user.click(searchButton);
    
    // Verify onSearch was called with correct filters
    expect(mockOnSearch).toHaveBeenCalledWith({
      keyword: '먹방',
      category: '음식',
      location: '서울',
      minSubscribers: 5000,
      maxSubscribers: 100000,
    });
  });

  it('handles empty optional fields correctly', async () => {
    const user = userEvent.setup();
    render(<CreatorSearch onSearch={mockOnSearch} />);
    
    // Only fill in keyword
    const keywordInput = screen.getByPlaceholderText(/채널명, 키워드 등/i);
    await user.type(keywordInput, '요리');
    
    // Click search
    const searchButton = screen.getByRole('button', { name: /검색하기/i });
    await user.click(searchButton);
    
    // Verify undefined for empty fields
    expect(mockOnSearch).toHaveBeenCalledWith({
      keyword: '요리',
      category: '',
      location: '',
      minSubscribers: undefined,
      maxSubscribers: undefined,
    });
  });

  it('parses number inputs correctly', async () => {
    const user = userEvent.setup();
    render(<CreatorSearch onSearch={mockOnSearch} />);
    
    const minSubscribersInput = screen.getByPlaceholderText('1000');
    await user.type(minSubscribersInput, 'abc123');
    
    const searchButton = screen.getByRole('button', { name: /검색하기/i });
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        minSubscribers: 123, // NaN values should be undefined
      })
    );
  });

  it('does not call onSearch when onSearch prop is not provided', async () => {
    const user = userEvent.setup();
    render(<CreatorSearch />);
    
    const searchButton = screen.getByRole('button', { name: /검색하기/i });
    await user.click(searchButton);
    
    // Should not throw error
    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});