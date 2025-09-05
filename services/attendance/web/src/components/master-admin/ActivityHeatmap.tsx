/**
 * Phase 3.3.1.2: 활동 히트맵 컴포넌트
 * 🟢 GREEN: 시간대별 출근 활동 시각화
 */

'use client';

import React, { useState, useMemo } from 'react';

interface ActivityData {
  time: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    day: string;
    time: string;
    value: number;
  } | null>(null);

  const dayLabels = {
    mon: '월',
    tue: '화',
    wed: '수',
    thu: '목',
    fri: '금'
  };

  const days = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;

  // Calculate intensity for color mapping
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach(timeSlot => {
      days.forEach(day => {
        max = Math.max(max, timeSlot[day]);
      });
    });
    return max;
  }, [data]);

  const getIntensityColor = (value: number): string => {
    if (value === 0) return 'bg-gray-50';
    
    const intensity = value / maxValue;
    
    if (intensity >= 0.8) return 'bg-green-500';
    if (intensity >= 0.6) return 'bg-green-400';
    if (intensity >= 0.4) return 'bg-green-300';
    if (intensity >= 0.2) return 'bg-green-200';
    return 'bg-green-100';
  };

  const getTextColor = (value: number): string => {
    const intensity = value / maxValue;
    return intensity >= 0.4 ? 'text-white' : 'text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">활동 히트맵</h3>
        <p className="text-sm text-gray-600">시간대별 출근 활동 분포</p>
      </div>

      <div data-testid="heatmap-container" className="relative">
        {/* Day headers */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="h-8"></div> {/* Empty cell for time column */}
          {days.map(day => (
            <div key={day} className="h-8 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {dayLabels[day]}
              </span>
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        {data.map((timeSlot, timeIndex) => (
          <div key={timeSlot.time} className="grid grid-cols-6 gap-2 mb-2">
            {/* Time label */}
            <div className="h-12 flex items-center justify-end pr-2">
              <span className="text-sm text-gray-600">{timeSlot.time}</span>
            </div>
            
            {/* Day cells */}
            {days.map(day => {
              const value = timeSlot[day];
              
              return (
                <div
                  key={`${timeSlot.time}-${day}`}
                  data-testid="heatmap-cell"
                  className={`
                    h-12 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md
                    flex items-center justify-center text-sm font-medium
                    ${getIntensityColor(value)} ${getTextColor(value)}
                  `}
                  onMouseEnter={() => setHoveredCell({
                    day: dayLabels[day],
                    time: timeSlot.time,
                    value
                  })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {value > 0 ? value : ''}
                </div>
              );
            })}
          </div>
        ))}

        {/* Tooltip */}
        {hoveredCell && (
          <div 
            data-testid="heatmap-tooltip"
            className="absolute z-10 bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none"
            style={{
              left: '50%',
              top: '10%',
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm">
              <p className="font-medium">{hoveredCell.day}요일 {hoveredCell.time}</p>
              <p className="text-xs text-gray-300 mt-1">
                출근 활동: {hoveredCell.value}명
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">적음</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-50 rounded"></div>
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <div className="w-4 h-4 bg-green-200 rounded"></div>
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <div className="w-4 h-4 bg-green-500 rounded"></div>
          </div>
          <span className="text-sm text-gray-600">많음</span>
        </div>
        
        <div className="text-sm text-gray-500">
          최대 활동: {maxValue}명
        </div>
      </div>

      {/* Summary statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        {days.map(day => {
          const dayTotal = data.reduce((sum, timeSlot) => sum + timeSlot[day], 0);
          const dayAverage = data.length > 0 ? (dayTotal / data.length).toFixed(1) : '0';
          
          return (
            <div key={day} className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">{dayLabels[day]}요일</p>
              <p className="text-lg font-semibold text-gray-900">{dayTotal}</p>
              <p className="text-xs text-gray-500">평균 {dayAverage}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}