'use client'

/**
 * Attendance Policy Section Component
 * 근태 정책 설정 섹션
 */

import React from 'react'
import { Control, Controller, FieldErrors } from 'react-hook-form'
import { KoreanOrganizationCreation } from '../../schemas/korean-business.schema'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Shield, 
  AlertTriangle,
  Info
} from 'lucide-react'

interface AttendancePolicySectionProps {
  control: Control<KoreanOrganizationCreation>
  errors: FieldErrors<KoreanOrganizationCreation>
}

export function AttendancePolicySection({
  control,
  errors
}: AttendancePolicySectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Shield className="h-5 w-5" />
        <h3 className="text-lg font-semibold">근태 정책 설정</h3>
      </div>

      <Tabs defaultValue="worktime" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="worktime">근무시간</TabsTrigger>
          <TabsTrigger value="checkin">출근체크</TabsTrigger>
          <TabsTrigger value="leave">휴가정책</TabsTrigger>
        </TabsList>

        <TabsContent value="worktime" className="space-y-6">
          <Card>
            <CardHeader>
              <h4 className="text-base font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>근무시간 정책</span>
              </h4>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="standardWorkHours">표준 근무시간 (시간/일)</Label>
                  <Controller
                    name="attendancePolicy.workTimePolicy.standardWorkHours"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="standardWorkHours"
                          type="number"
                          min={1}
                          max={24}
                          placeholder="8"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          근로기준법 기준 8시간 권장
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxOvertimeHours">최대 연장근무 (시간/일)</Label>
                  <Controller
                    name="attendancePolicy.workTimePolicy.maxOvertimeHours"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="maxOvertimeHours"
                          type="number"
                          min={0}
                          max={12}
                          placeholder="4"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          근로기준법 기준 최대 12시간
                        </p>
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
                  <Label htmlFor="breakTimeMinutes">휴게시간 (분)</Label>
                  <Controller
                    name="attendancePolicy.workTimePolicy.breakTimeMinutes"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="breakTimeMinutes"
                          type="number"
                          min={0}
                          max={120}
                          placeholder="60"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          8시간 근무 시 1시간 권장
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flexTimeMinutes">출근 허용 지연 (분)</Label>
                  <Controller
                    name="attendancePolicy.workTimePolicy.flexTimeMinutes"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="flexTimeMinutes"
                          type="number"
                          min={0}
                          max={60}
                          placeholder="10"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          지각 처리되지 않는 허용 시간
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>근로기준법 준수:</strong> 설정하신 근무시간 정책이 근로기준법을 준수하는지 
                  노무사와 상담하시기 바랍니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkin" className="space-y-6">
          <Card>
            <CardHeader>
              <h4 className="text-base font-medium flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>출근 체크 정책</span>
              </h4>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Controller
                    name="attendancePolicy.checkInPolicy.allowEarlyCheckIn"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="allowEarlyCheckIn"
                      />
                    )}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="allowEarlyCheckIn" className="text-sm font-medium">
                      조기 출근 허용
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      정규 출근 시간 이전에도 출근 체크를 허용합니다
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Controller
                    name="attendancePolicy.checkInPolicy.allowLateCheckIn"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="allowLateCheckIn"
                      />
                    )}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="allowLateCheckIn" className="text-sm font-medium">
                      지각 출근 허용
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      정규 출근 시간 이후에도 출근 체크를 허용합니다 (지각 처리)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Controller
                    name="attendancePolicy.checkInPolicy.requireGPS"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="requireGPS"
                      />
                    )}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="requireGPS" className="text-sm font-medium">
                      GPS 위치 확인 필수
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      설정한 사업장 반경 내에서만 출근 체크를 허용합니다
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Controller
                    name="attendancePolicy.checkInPolicy.requireQR"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="requireQR"
                      />
                    )}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="requireQR" className="text-sm font-medium">
                      QR 코드 스캔 필수
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      사업장에 배치된 QR 코드를 스캔해야만 출근 체크가 가능합니다
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Controller
                    name="attendancePolicy.checkInPolicy.requirePhoto"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="requirePhoto"
                      />
                    )}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="requirePhoto" className="text-sm font-medium">
                      출근 사진 촬영 필수
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      출근 체크 시 본인 확인을 위한 사진 촬영을 의무화합니다
                    </p>
                  </div>
                </div>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>개인정보 보호:</strong> 사진 촬영을 의무화하는 경우 직원들의 
                  개인정보 처리 동의를 별도로 받아야 합니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          <Card>
            <CardHeader>
              <h4 className="text-base font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>휴가 정책</span>
              </h4>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualLeaves">연차휴가 (일/년)</Label>
                  <Controller
                    name="attendancePolicy.leavePolicy.annualLeaves"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="annualLeaves"
                          type="number"
                          min={0}
                          max={30}
                          placeholder="15"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 15)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          법정 최소 15일
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sickLeaves">병가 (일/년)</Label>
                  <Controller
                    name="attendancePolicy.leavePolicy.sickLeaves"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="sickLeaves"
                          type="number"
                          min={0}
                          max={30}
                          placeholder="3"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          무급/유급 구분 별도 설정
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalLeaves">개인사유휴가 (일/년)</Label>
                  <Controller
                    name="attendancePolicy.leavePolicy.personalLeaves"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id="personalLeaves"
                          type="number"
                          min={0}
                          max={30}
                          placeholder="3"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          경조사, 개인 일정 등
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>휴가 정책 안내:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• 연차휴가는 근로기준법에 따라 1년 미만 근무자에게는 월 1일씩 부여</li>
                    <li>• 1년 이상 근무자에게는 15일 + 2년마다 1일 추가 (최대 25일)</li>
                    <li>• 병가와 개인사유휴가는 회사 내부 정책에 따라 설정 가능</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          설정하신 근태 정책은 조직 생성 후에도 관리자 페이지에서 언제든지 수정할 수 있습니다.
        </AlertDescription>
      </Alert>
    </div>
  )
}