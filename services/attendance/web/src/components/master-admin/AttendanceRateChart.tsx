/**
 * Phase 3.3.1.2: 출근율 추이 차트 컴포넌트
 * 🟢 GREEN: Recharts 기반 현대적 차트 구현
 */

'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';

interface AttendanceData {
  month: string;
  rate: number;
  target?: number;
}

interface AttendanceRateChartProps {
  data: AttendanceData[];
  showTarget?: boolean;
  enableZoom?: boolean;
  enableExport?: boolean;
}

export function AttendanceRateChart({ 
  data, 
  showTarget = false, 
  enableZoom = false, 
  enableExport = false 
}: AttendanceRateChartProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <p className="text-lg">데이터가 없습니다</p>
          <p className="text-sm">출근율 데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log('Exporting chart...');
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${label}월`}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">출근율 추이</h3>
          <p className="text-sm text-gray-600">월별 평균 출근율 변화</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {enableZoom && (
            <div data-testid="zoom-controls" className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white rounded transition-colors"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs px-2">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white rounded transition-colors"
                disabled={zoomLevel >= 2}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {enableExport && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          )}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
              name="출근율"
            />
            
            {showTarget && (
              <Line
                type="monotone"
                dataKey="target"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="목표"
              />
            )}
            
            {showTarget && data[0]?.target && (
              <ReferenceLine 
                y={data[0].target} 
                stroke="#ef4444" 
                strokeDasharray="3 3"
                label={{ value: "목표선", position: "right" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {data.map((item, index) => {
          const isAboveTarget = showTarget && item.target ? item.rate >= item.target : true;
          
          return (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">{item.month}월</p>
              <p className={`text-lg font-semibold ${
                isAboveTarget ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {item.rate}%
              </p>
              {showTarget && item.target && (
                <p className="text-xs text-gray-500">목표: {item.target}%</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}