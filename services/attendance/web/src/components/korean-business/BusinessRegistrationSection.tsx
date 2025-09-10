'use client'

/**
 * Business Registration Section Component
 * 한국 사업자 등록 정보 입력 섹션
 */

import React, { useState } from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'
import { KoreanOrganizationCreation, validateKoreanBusinessNumber } from '../../schemas/korean-business.schema'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Alert, AlertDescription } from '../ui/alert'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { CalendarIcon, MapPin, Building } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '../../lib/utils'

interface BusinessRegistrationSectionProps {
  control: Control<KoreanOrganizationCreation>
  errors: FieldErrors<KoreanOrganizationCreation>
}

export function BusinessRegistrationSection({
  control,
  errors
}: BusinessRegistrationSectionProps) {
  const [businessNumberStatus, setBusinessNumberStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')

  const validateBusinessNumber = async (businessNumber: string) => {
    if (!businessNumber || businessNumber.length < 10) {
      setBusinessNumberStatus('idle')
      return
    }

    setBusinessNumberStatus('validating')
    
    // 클라이언트 측 검증
    const isValid = validateKoreanBusinessNumber(businessNumber)
    
    if (isValid) {
      setBusinessNumberStatus('valid')
    } else {
      setBusinessNumberStatus('invalid')
    }
  }

  const handleAddressSearch = () => {
    // 다음 우편번호 API 연동 (실제 구현에서는 window.daum.postcode 사용)
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: function(data: any) {
          // 주소 데이터 처리
          console.log('Address data:', data)
        }
      }).open()
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="space-y-6">
      {/* 기본 사업자 정보 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>사업자 기본 정보</span>
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessNumber">사업자등록번호 *</Label>
              <Controller
                name="businessRegistration.businessNumber"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <div className="relative">
                      <Input
                        {...field}
                        id="businessNumber"
                        placeholder="000-00-00000"
                        maxLength={12}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^0-9]/g, '')
                          if (value.length > 3 && value.length <= 5) {
                            value = value.slice(0, 3) + '-' + value.slice(3)
                          } else if (value.length > 5) {
                            value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10)
                          }
                          field.onChange(value)
                          validateBusinessNumber(value)
                        }}
                        className={cn(
                          fieldState.error && 'border-red-500',
                          businessNumberStatus === 'valid' && 'border-green-500',
                          businessNumberStatus === 'invalid' && 'border-red-500'
                        )}
                      />
                      {businessNumberStatus === 'validating' && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        </div>
                      )}
                      {businessNumberStatus === 'valid' && (
                        <div className="absolute right-3 top-2.5 text-green-600">✓</div>
                      )}
                      {businessNumberStatus === 'invalid' && (
                        <div className="absolute right-3 top-2.5 text-red-600">✗</div>
                      )}
                    </div>
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                    {businessNumberStatus === 'invalid' && (
                      <p className="text-sm text-red-600">유효하지 않은 사업자등록번호입니다</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="corporateNumber">법인등록번호</Label>
              <Controller
                name="businessRegistration.corporateNumber"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="corporateNumber"
                      placeholder="000000-0000000"
                      maxLength={14}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^0-9]/g, '')
                        if (value.length > 6) {
                          value = value.slice(0, 6) + '-' + value.slice(6, 13)
                        }
                        field.onChange(value)
                      }}
                      className={fieldState.error ? 'border-red-500' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName">상호명 *</Label>
            <Controller
              name="businessRegistration.businessName"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    id="businessName"
                    placeholder="예: (주)도트테크놀로지"
                    className={fieldState.error ? 'border-red-500' : ''}
                  />
                  {fieldState.error && (
                    <p className="text-sm text-red-600">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessNameEng">영문 상호명</Label>
            <Controller
              name="businessRegistration.businessNameEng"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="businessNameEng"
                  placeholder="DOT Technology Co., Ltd."
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">업태 *</Label>
              <Controller
                name="businessRegistration.businessType"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="businessType"
                      placeholder="예: 소프트웨어 개발업"
                      className={fieldState.error ? 'border-red-500' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessItem">종목 *</Label>
              <Controller
                name="businessRegistration.businessItem"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="businessItem"
                      placeholder="예: 모바일 애플리케이션 개발"
                      className={fieldState.error ? 'border-red-500' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="representativeName">대표자명 *</Label>
              <Controller
                name="businessRegistration.representativeName"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="representativeName"
                      placeholder="예: 김도트"
                      className={fieldState.error ? 'border-red-500' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="representativeNameEng">영문 대표자명</Label>
              <Controller
                name="businessRegistration.representativeNameEng"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="representativeNameEng"
                    placeholder="Kim Dot"
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="establishedDate">설립일 *</Label>
            <Controller
              name="businessRegistration.establishedDate"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          fieldState.error && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP", { locale: ko }) : "설립일을 선택하세요"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        locale={ko}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldState.error && (
                    <p className="text-sm text-red-600">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* 사업장 주소 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>사업장 주소</span>
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Controller
              name="businessRegistration.businessAddress.postalCode"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="우편번호"
                  className="w-32"
                  readOnly
                />
              )}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddressSearch}
            >
              주소 검색
            </Button>
          </div>

          <Controller
            name="businessRegistration.businessAddress.roadAddress"
            control={control}
            render={({ field, fieldState }) => (
              <>
                <Input
                  {...field}
                  placeholder="도로명주소"
                  readOnly
                  className={fieldState.error ? 'border-red-500' : ''}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-600">{fieldState.error.message}</p>
                )}
              </>
            )}
          />

          <Controller
            name="businessRegistration.businessAddress.detailAddress"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="상세주소"
              />
            )}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Controller
              name="businessRegistration.businessAddress.sido"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="시/도"
                  readOnly
                />
              )}
            />
            <Controller
              name="businessRegistration.businessAddress.sigungu"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="시/군/구"
                  readOnly
                />
              )}
            />
            <Controller
              name="businessRegistration.businessAddress.dong"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="동/면/읍"
                  readOnly
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* 연락처 정보 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호</Label>
              <Controller
                name="businessRegistration.phoneNumber"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="phoneNumber"
                      placeholder="02-1234-5678"
                      className={fieldState.error ? 'border-red-500' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Controller
                name="businessRegistration.email"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="contact@example.com"
                      className={fieldState.error ? 'border-red-500' : ''}
                    />
                    {fieldState.error && (
                      <p className="text-sm text-red-600">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capitalAmount">자본금 (원)</Label>
              <Controller
                name="businessRegistration.capitalAmount"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="capitalAmount"
                    type="number"
                    placeholder="10000000"
                    min={0}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeCount">직원 수 (명)</Label>
              <Controller
                name="businessRegistration.employeeCount"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="employeeCount"
                    type="number"
                    placeholder="10"
                    min={0}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          사업자등록번호는 실제 등록된 번호를 입력해주세요. 
          향후 사업자등록증 업로드를 통한 검증이 진행됩니다.
        </AlertDescription>
      </Alert>
    </div>
  )
}

declare global {
  interface Window {
    daum: any
  }
}