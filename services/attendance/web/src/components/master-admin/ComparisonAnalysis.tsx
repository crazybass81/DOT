/**
 * Phase 3.3.1.2: 조직간 비교 분석 차트
 * 🟢 GREEN: Recharts 기반 비교 분석 대시보드
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';

interface ComparisonData {
  organization: string;
  attendance: number;
  employees: number;
  efficiency: number;
}

interface ComparisonAnalysisProps {
  data: ComparisonData[];
  metric?: 'attendance' | 'employees' | 'efficiency';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function ComparisonAnalysis({ data, metric = 'attendance' }: ComparisonAnalysisProps) {
  const [selectedMetric, setSelectedMetric] = useState<'attendance' | 'employees' | 'efficiency'>(metric);
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const metricConfig = {
    attendance: {
      label: '출근율',
      unit: '%',
      color: '#3b82f6',
      description: '평균 출근율 비교',
      icon: Target
    },
    employees: {
      label: '직원 수',
      unit: '명',
      color: '#10b981',
      description: '조직별 직원 수',
      icon: Users
    },
    efficiency: {
      label: '효율성',
      unit: '점',
      color: '#f59e0b',
      description: '업무 효율성 점수',
      icon: TrendingUp
    }
  };

  const currentConfig = metricConfig[selectedMetric];

  // Sort data by selected metric for better visualization
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b[selectedMetric] - a[selectedMetric]);
  }, [data, selectedMetric]);

  // Get top performers
  const topPerformers = useMemo(() => {
    return sortedData.slice(0, 3);
  }, [sortedData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">출근율: {data.attendance}%</p>
          <p className="text-sm text-green-600">직원 수: {data.employees}명</p>
          <p className="text-sm text-yellow-600">효율성: {data.efficiency}점</p>
        </div>
      );
    }
    return null;
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="organization" 
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `${value}${currentConfig.unit}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey={selectedMetric} 
          fill={currentConfig.color}
          radius={[4, 4, 0, 0]}
        >
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={sortedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value, percent }) => `${name}: ${value}${currentConfig.unit} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={selectedMetric}
        >
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value}${currentConfig.unit}`, currentConfig.label]} />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedMetric === 'efficiency' ? '효율성 비교' : '조직별 비교 분석'}
          </h3>
          <p className="text-sm text-gray-600">{currentConfig.description}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Metric selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {Object.entries(metricConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key as any)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedMetric === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
          
          {/* Chart type selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bar
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                chartType === 'pie'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pie
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        {chartType === 'bar' ? renderBarChart() : renderPieChart()}
      </div>

      {/* Top performers */}
      <div data-testid="top-performers" className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
          <Trophy className="w-4 h-4 text-yellow-500 mr-2" />
          상위 성과 조직
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topPerformers.map((org, index) => {
            const Icon = currentConfig.icon;
            const rankColors = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];
            const rankTextColors = ['text-yellow-600', 'text-gray-600', 'text-orange-600'];
            
            return (
              <div
                key={org.organization}
                className={`${rankColors[index]} border rounded-lg p-4`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium ${rankTextColors[index]}`}>
                    #{index + 1}
                  </span>
                  <Icon className={`w-4 h-4 ${rankTextColors[index]}`} />
                </div>
                
                <h5 className="font-medium text-gray-900 mb-1">{org.organization}</h5>
                <p className={`text-lg font-bold ${rankTextColors[index]}`}>
                  {org[selectedMetric]}{currentConfig.unit}
                </p>
                
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span>출근율</span>
                    <p className="font-medium">{org.attendance}%</p>
                  </div>
                  <div>
                    <span>직원 수</span>
                    <p className="font-medium">{org.employees}명</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics summary */}
      <div className="border-t border-gray-200 pt-6 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">평균 {currentConfig.label}</p>
            <p className={`text-lg font-semibold ${currentConfig.color}`} style={{ color: currentConfig.color }}>
              {(sortedData.reduce((sum, org) => sum + org[selectedMetric], 0) / sortedData.length).toFixed(1)}
              {currentConfig.unit}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">최고 성과</p>
            <p className="text-lg font-semibold text-green-600">
              {Math.max(...sortedData.map(org => org[selectedMetric]))}{currentConfig.unit}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">최저 성과</p>
            <p className="text-lg font-semibold text-red-600">
              {Math.min(...sortedData.map(org => org[selectedMetric]))}{currentConfig.unit}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">표준편차</p>
            <p className="text-lg font-semibold text-blue-600">
              {(() => {
                const values = sortedData.map(org => org[selectedMetric]);
                const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
                return Math.sqrt(variance).toFixed(1);
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}