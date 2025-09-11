/**
 * 사업자등록증 업로드 컴포넌트
 * GitHub 스타일 UI/UX 패턴 적용
 */

'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, X } from 'lucide-react';

interface BusinessRegistrationUploadProps {
  organizationId: string;
  onUploadSuccess?: (data: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

interface FormData {
  registration_number: string;
  business_name: string;
  business_type: string;
  address: string;
  representative_name: string;
}

export default function BusinessRegistrationUpload({
  organizationId,
  onUploadSuccess,
  onUploadError,
  className = ''
}: BusinessRegistrationUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    registration_number: '',
    business_name: '',
    business_type: '',
    address: '',
    representative_name: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setUploadError('지원되지 않는 파일 형식입니다. (JPEG, PNG, PDF만 허용)');
      return;
    }

    // 파일 크기 검증 (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setFile(selectedFile);
    setUploadError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFormDataChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setUploadError('파일을 선택해주세요.');
      return;
    }

    if (!formData.registration_number.trim()) {
      setUploadError('사업자등록번호를 입력해주세요.');
      return;
    }

    if (!formData.business_name.trim()) {
      setUploadError('상호명을 입력해주세요.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const submitFormData = new FormData();
      submitFormData.append('file', file);
      submitFormData.append('registration_number', formData.registration_number.trim());
      submitFormData.append('business_name', formData.business_name.trim());
      submitFormData.append('business_type', formData.business_type.trim());
      submitFormData.append('address', formData.address.trim());
      submitFormData.append('representative_name', formData.representative_name.trim());

      const response = await fetch(`/api/organization/${organizationId}/business-registration`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: submitFormData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '업로드에 실패했습니다.');
      }

      setUploadSuccess(true);
      onUploadSuccess?.(result.data);
      
      // 폼 초기화
      setFile(null);
      setFormData({
        registration_number: '',
        business_name: '',
        business_type: '',
        address: '',
        representative_name: ''
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '업로드에 실패했습니다.';
      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadSuccess) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900 font-korean">
              업로드 완료
            </h3>
            <p className="text-green-700 font-korean">
              사업자등록증이 성공적으로 업로드되었습니다. 검토 후 승인됩니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm ${className}`}>
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 font-korean">
            사업자등록증 업로드
          </h3>
          <p className="text-gray-600 text-sm font-korean">
            사업자등록증을 업로드하고 기본 정보를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 파일 업로드 영역 */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 font-korean">
              사업자등록증 파일 *
            </label>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {file ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 font-korean">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 font-korean"
                  >
                    <X className="w-3 h-3 mr-1" />
                    제거
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 font-korean">
                      파일을 드래그하거나 클릭하여 업로드
                    </p>
                    <p className="text-xs text-gray-500 font-korean">
                      JPEG, PNG, PDF (최대 10MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 font-korean"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    파일 선택
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* 사업자 정보 입력 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                사업자등록번호 *
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => handleFormDataChange('registration_number', e.target.value)}
                placeholder="000-00-00000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                상호명 *
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => handleFormDataChange('business_name', e.target.value)}
                placeholder="회사명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                업종
              </label>
              <input
                type="text"
                value={formData.business_type}
                onChange={(e) => handleFormDataChange('business_type', e.target.value)}
                placeholder="예: 음식점업"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                대표자명
              </label>
              <input
                type="text"
                value={formData.representative_name}
                onChange={(e) => handleFormDataChange('representative_name', e.target.value)}
                placeholder="대표자 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
              사업장 주소
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleFormDataChange('address', e.target.value)}
              placeholder="사업장 주소를 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 에러 메시지 */}
          {uploadError && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span className="font-korean">{uploadError}</span>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || !file || !formData.registration_number.trim() || !formData.business_name.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-korean"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>업로드 중...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>업로드</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}