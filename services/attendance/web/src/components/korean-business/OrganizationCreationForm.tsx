'use client'

/**
 * Korean Business Organization Creation Form
 * 한국 사업자 등록 기반 조직 생성 폼
 */

import React, { useState, useCallback } from 'react'
import { useForm, Controller, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  KoreanOrganizationCreationSchema,
  KoreanOrganizationCreation,
  validateKoreanBusinessNumber,
  validateKoreanCorporateNumber
} from '../../schemas/korean-business.schema'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { Alert, AlertDescription } from '../ui/alert'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { MapPin, Building2, Users, FileText, Clock, Shield } from 'lucide-react'
import { BusinessRegistrationSection } from './BusinessRegistrationSection'
import { WorkplaceLocationSection } from './WorkplaceLocationSection'
import { AttendancePolicySection } from './AttendancePolicySection'
import { DocumentUploadSection } from './DocumentUploadSection'

interface OrganizationCreationFormProps {
  onSuccess: (organizationId: string, invitationCode: string) => void
  onError: (error: string) => void
  className?: string
}

export function OrganizationCreationForm({
  onSuccess,
  onError,
  className
}: OrganizationCreationFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)

  const form = useForm<KoreanOrganizationCreation>({
    resolver: zodResolver(KoreanOrganizationCreationSchema),
    defaultValues: {
      organizationType: 'personal',
      workplaceLocations: [{
        name: '',
        address: {
          roadAddress: '',
          detailAddress: '',
          sido: '',
          sigungu: '',
          postalCode: ''
        },
        coordinates: {
          latitude: 37.5665,
          longitude: 126.9780
        },
        checkInRadius: 100,
        businessHours: {
          monday: { start: '09:00', end: '18:00', isWorkingDay: true },
          tuesday: { start: '09:00', end: '18:00', isWorkingDay: true },
          wednesday: { start: '09:00', end: '18:00', isWorkingDay: true },
          thursday: { start: '09:00', end: '18:00', isWorkingDay: true },
          friday: { start: '09:00', end: '18:00', isWorkingDay: true },
          saturday: { start: '09:00', end: '18:00', isWorkingDay: false },
          sunday: { start: '09:00', end: '18:00', isWorkingDay: false }
        },
        isActive: true
      }],
      attendancePolicy: {
        workTimePolicy: {
          standardWorkHours: 8,
          maxOvertimeHours: 4,
          breakTimeMinutes: 60,
          flexTimeMinutes: 10
        },
        checkInPolicy: {
          allowEarlyCheckIn: true,
          allowLateCheckIn: true,
          requireGPS: true,
          requireQR: false,
          requirePhoto: false
        },
        leavePolicy: {
          annualLeaves: 15,
          sickLeaves: 3,
          personalLeaves: 3
        }
      },
      adminSettings: {
        maxAdmins: 3,
        adminRoles: ['owner']
      },
      invitationSettings: {
        enableQRInvitation: true,
        enableEmailInvitation: true,
        invitationExpiryHours: 72,
        maxPendingInvitations: 50
      }
    }
  })

  const steps = [
    {
      id: 'basic',
      title: '기본 정보',
      description: '조직의 기본 정보를 입력하세요',
      icon: Building2
    },
    {
      id: 'business',
      title: '사업자 등록',
      description: '사업자등록번호와 사업체 정보를 입력하세요',
      icon: FileText
    },
    {
      id: 'locations',
      title: '사업장 위치',
      description: 'GPS 기반 출근 체크를 위한 사업장을 설정하세요',
      icon: MapPin
    },
    {
      id: 'policies',
      title: '근태 정책',
      description: '근무시간과 출근 정책을 설정하세요',
      icon: Clock
    },
    {
      id: 'settings',
      title: '조직 설정',
      description: '관리자와 초대 설정을 완료하세요',
      icon: Shield
    }
  ]

  const progressPercentage = ((currentStep + 1) / steps.length) * 100

  const handleNext = useCallback(async () => {
    const stepFields = getStepFields(currentStep)
    const isValid = await form.trigger(stepFields as any)
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    }
  }, [currentStep, form])

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const onSubmit = async (data: KoreanOrganizationCreation) => {
    setIsSubmitting(true)
    setSubmitProgress(0)

    try {
      // 사업자등록번호 검증
      if (!validateKoreanBusinessNumber(data.businessRegistration.businessNumber)) {
        throw new Error('유효하지 않은 사업자등록번호입니다')
      }

      // 법인등록번호 검증 (있는 경우)
      if (data.businessRegistration.corporateNumber && 
          !validateKoreanCorporateNumber(data.businessRegistration.corporateNumber)) {
        throw new Error('유효하지 않은 법인등록번호입니다')
      }

      setSubmitProgress(25)

      // API 호출
      const response = await fetch('/api/korean-business/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      setSubmitProgress(75)

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '조직 생성에 실패했습니다')
      }

      setSubmitProgress(100)

      // 성공 처리
      onSuccess(result.data.organizationId, result.data.invitationCode)

    } catch (error) {
      console.error('Organization creation error:', error)
      onError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
      setSubmitProgress(0)
    }
  }

  function getStepFields(step: number): (keyof KoreanOrganizationCreation)[] {
    switch (step) {
      case 0:
        return ['organizationName', 'organizationType', 'description']
      case 1:
        return ['businessRegistration']
      case 2:
        return ['workplaceLocations']
      case 3:
        return ['attendancePolicy']
      case 4:
        return ['adminSettings', 'invitationSettings']
      default:
        return []
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep()
      case 1:
        return <BusinessRegistrationSection control={form.control} errors={form.formState.errors} />
      case 2:
        return <WorkplaceLocationSection control={form.control} errors={form.formState.errors} />
      case 3:
        return <AttendancePolicySection control={form.control} errors={form.formState.errors} />
      case 4:
        return renderOrganizationSettingsStep()
      default:
        return null
    }
  }

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="organizationName">조직명 *</Label>
        <Controller
          name="organizationName"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <Input
                {...field}
                id="organizationName"
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
        <Label htmlFor="organizationType">조직 유형 *</Label>
        <Controller
          name="organizationType"
          control={form.control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder="조직 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">개인사업자</SelectItem>
                <SelectItem value="corporate">법인</SelectItem>
                <SelectItem value="franchise">가맹점</SelectItem>
                <SelectItem value="branch">지점</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">조직 설명</Label>
        <Controller
          name="description"
          control={form.control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="description"
              placeholder="조직에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          )}
        />
      </div>
    </div>
  )

  const renderOrganizationSettingsStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">관리자 설정</h3>
        
        <div className="space-y-2">
          <Label htmlFor="maxAdmins">최대 관리자 수</Label>
          <Controller
            name="adminSettings.maxAdmins"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={1}
                max={10}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">초대 설정</h3>
        
        <div className="flex items-center space-x-2">
          <Controller
            name="invitationSettings.enableQRInvitation"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="enableQRInvitation"
              />
            )}
          />
          <Label htmlFor="enableQRInvitation">QR 코드 초대 활성화</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Controller
            name="invitationSettings.enableEmailInvitation"
            control={form.control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="enableEmailInvitation"
              />
            )}
          />
          <Label htmlFor="enableEmailInvitation">이메일 초대 활성화</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invitationExpiryHours">초대 만료 시간 (시간)</Label>
          <Controller
            name="invitationSettings.invitationExpiryHours"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={1}
                max={168}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPendingInvitations">최대 대기 중인 초대 수</Label>
          <Controller
            name="invitationSettings.maxPendingInvitations"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={1}
                max={100}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />
        </div>
      </div>
    </div>
  )

  return (
    <FormProvider {...form}>
      <Card className={className}>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">조직 생성</h1>
            <div className="text-sm text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </div>
          </div>
          
          <Progress value={progressPercentage} className="w-full" />
          
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:inline">
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isSubmitting && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center space-x-2">
                  <Progress value={submitProgress} className="flex-1" />
                  <span className="text-sm">조직 생성 중...</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {renderStep()}
              
              <div className="flex items-center justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  이전
                </Button>
                
                {currentStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? '생성 중...' : '조직 생성'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    다음
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </FormProvider>
  )
}