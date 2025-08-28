'use client';

import { useState, useEffect } from 'react';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
  }[];
}

export default function AttendanceChart() {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  
  // Mock data for visualization
  const weekData = {
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    datasets: [
      {
        label: '출근',
        data: [23, 24, 22, 25, 24, 15, 10],
        backgroundColor: '#10B981'
      },
      {
        label: '지각',
        data: [2, 1, 3, 0, 1, 1, 0],
        backgroundColor: '#F59E0B'
      },
      {
        label: '결근',
        data: [0, 0, 0, 0, 0, 9, 15],
        backgroundColor: '#EF4444'
      }
    ]
  };

  const monthData = {
    labels: ['1주차', '2주차', '3주차', '4주차'],
    datasets: [
      {
        label: '평균 출근율',
        data: [92, 95, 88, 90],
        backgroundColor: '#3B82F6'
      }
    ]
  };

  const currentData = period === 'week' ? weekData : monthData;
  const maxValue = Math.max(...currentData.datasets.flatMap(d => d.data));

  const renderBar = (value: number, color: string, label: string) => {
    const height = (value / maxValue) * 200;
    return (
      <div className="flex flex-col items-center">
        <div className="relative h-52 w-full flex items-end justify-center">
          <div
            className="w-12 transition-all duration-500 rounded-t"
            style={{
              height: `${height}px`,
              backgroundColor: color
            }}
            title={`${label}: ${value}`}
          >
            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
              {value}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">근태 통계</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 rounded-lg text-sm ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 rounded-lg text-sm ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            월간
          </button>
        </div>
      </div>

      {/* Simple Chart Visualization */}
      <div className="relative">
        {period === 'week' ? (
          <div>
            <div className="grid grid-cols-7 gap-2">
              {weekData.labels.map((label, index) => (
                <div key={label} className="text-center">
                  <div className="flex flex-col gap-1">
                    {weekData.datasets.map((dataset) => (
                      <div key={dataset.label} className="relative">
                        {renderBar(dataset.data[index], dataset.backgroundColor, dataset.label)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {weekData.datasets.map((dataset) => (
                <div key={dataset.label} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: dataset.backgroundColor }}
                  />
                  <span className="text-sm text-gray-600">{dataset.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-4">
              {monthData.labels.map((label, index) => (
                <div key={label} className="text-center">
                  <div className="relative h-52 flex items-end justify-center">
                    <div
                      className="w-full max-w-20 transition-all duration-500 rounded-t bg-blue-500"
                      style={{
                        height: `${(monthData.datasets[0].data[index] / 100) * 200}px`
                      }}
                    >
                      <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-sm font-medium">
                        {monthData.datasets[0].data[index]}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">95%</p>
          <p className="text-xs text-gray-500">평균 출근율</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">8.2h</p>
          <p className="text-xs text-gray-500">평균 근무시간</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">1.5</p>
          <p className="text-xs text-gray-500">평균 지각/일</p>
        </div>
      </div>
    </div>
  );
}