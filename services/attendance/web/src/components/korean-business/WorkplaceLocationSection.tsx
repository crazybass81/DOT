'use client'

/**
 * Workplace Location Section Component
 * GPS 기반 사업장 위치 설정 섹션
 */

import React, { useState, useEffect } from 'react'
import { Control, Controller, FieldErrors, useFieldArray } from 'react-hook-form'
import { KoreanOrganizationCreation } from '../../schemas/korean-business.schema'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Navigation, 
  Clock, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface WorkplaceLocationSectionProps {
  control: Control<KoreanOrganizationCreation>
  errors: FieldErrors<KoreanOrganizationCreation>
}

interface LocationState {
  isLoadingLocation: boolean
  locationError: string | null
  currentLocation: { lat: number; lng: number } | null
}

export function WorkplaceLocationSection({
  control,
  errors
}: WorkplaceLocationSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'workplaceLocations'
  })

  const [locationStates, setLocationStates] = useState<LocationState[]>(
    fields.map(() => ({
      isLoadingLocation: false,
      locationError: null,
      currentLocation: null
    }))
  )

  const daysOfWeek = [
    { key: 'monday', label: '월요일' },
    { key: 'tuesday', label: '화요일' },
    { key: 'wednesday', label: '수요일' },
    { key: 'thursday', label: '목요일' },
    { key: 'friday', label: '금요일' },
    { key: 'saturday', label: '토요일' },
    { key: 'sunday', label: '일요일' }
  ] as const

  const getCurrentLocation = async (index: number) => {
    setLocationStates(prev => prev.map((state, i) => 
      i === index ? { ...state, isLoadingLocation: true, locationError: null } : state
    ))

    try {
      if (!navigator.geolocation) {
        throw new Error('이 브라우저는 위치 서비스를 지원하지 않습니다')
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
      })

      const { latitude, longitude } = position.coords

      // 위치 정보를 폼에 업데이트
      const fieldPath = `workplaceLocations.${index}.coordinates` as const
      control._formValues.workplaceLocations[index].coordinates = {
        latitude,
        longitude
      }

      setLocationStates(prev => prev.map((state, i) => 
        i === index ? {
          ...state,
          isLoadingLocation: false,
          currentLocation: { lat: latitude, lng: longitude }
        } : state
      ))

      // 역지오코딩으로 주소 가져오기 (실제 구현에서는 Google Maps API 등 사용)
      await reverseGeocode(latitude, longitude, index)

    } catch (error) {
      const errorMessage = error instanceof GeolocationPositionError 
        ? getGeolocationErrorMessage(error.code)
        : error instanceof Error 
        ? error.message 
        : '위치를 가져오는 중 오류가 발생했습니다'

      setLocationStates(prev => prev.map((state, i) => 
        i === index ? {
          ...state,
          isLoadingLocation: false,
          locationError: errorMessage
        } : state
      ))
    }
  }

  const reverseGeocode = async (lat: number, lng: number, index: number) => {
    try {
      // 실제 구현에서는 Google Maps Geocoding API나 카카오맵 API 사용
      // 여기서는 임시로 더미 데이터 사용
      const address = {
        roadAddress: `서울특별시 강남구 테헤란로 ${Math.floor(Math.random() * 500) + 1}`,
        sido: '서울특별시',
        sigungu: '강남구',
        dong: '역삼동',
        postalCode: '06292'
      }

      // 주소 정보를 폼에 업데이트
      control._formValues.workplaceLocations[index].address = address
      
    } catch (error) {
      console.error('Reverse geocoding error:', error)
    }
  }

  const getGeolocationErrorMessage = (code: number): string => {
    switch (code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        return '위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        return '위치 정보를 사용할 수 없습니다.'
      case GeolocationPositionError.TIMEOUT:
        return '위치 요청이 시간 초과되었습니다.'
      default:
        return '위치를 가져오는 중 오류가 발생했습니다.'
    }
  }

  const addWorkplaceLocation = () => {
    append({
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
    })

    setLocationStates(prev => [...prev, {
      isLoadingLocation: false,
      locationError: null,
      currentLocation: null
    }])
  }

  const removeWorkplaceLocation = (index: number) => {
    remove(index)
    setLocationStates(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">사업장 위치 설정</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addWorkplaceLocation}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>사업장 추가</span>
        </Button>
      </div>

      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-base font-medium">
              사업장 {index + 1}
            </h4>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeWorkplaceLocation(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">기본 정보</TabsTrigger>
                <TabsTrigger value="location">위치 설정</TabsTrigger>
                <TabsTrigger value="hours">근무 시간</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`workplaceName-${index}`}>사업장명 *</Label>
                  <Controller
                    name={`workplaceLocations.${index}.name`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id={`workplaceName-${index}`}
                          placeholder="예: 본점, 강남점"
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
                  <Label htmlFor={`checkInRadius-${index}`}>출근 체크 반경 (미터)</Label>
                  <Controller
                    name={`workplaceLocations.${index}.checkInRadius`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input
                          {...field}
                          id={`checkInRadius-${index}`}
                          type="number"
                          min={10}
                          max={1000}
                          placeholder="100"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                        <p className="text-sm text-muted-foreground">
                          직원이 이 반경 내에서만 출근 체크를 할 수 있습니다. (10m ~ 1000m)
                        </p>
                        {fieldState.error && (
                          <p className="text-sm text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">GPS 좌표</h5>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => getCurrentLocation(index)}
                    disabled={locationStates[index]?.isLoadingLocation}
                    className="flex items-center space-x-2"
                  >
                    {locationStates[index]?.isLoadingLocation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
                        <span>위치 가져오는 중...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4" />
                        <span>현재 위치 가져오기</span>
                      </>
                    )}
                  </Button>
                </div>

                {locationStates[index]?.locationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {locationStates[index].locationError}
                    </AlertDescription>
                  </Alert>
                )}

                {locationStates[index]?.currentLocation && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      현재 위치가 설정되었습니다.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`latitude-${index}`}>위도</Label>
                    <Controller
                      name={`workplaceLocations.${index}.coordinates.latitude`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            {...field}
                            id={`latitude-${index}`}
                            type="number"
                            step="any"
                            placeholder="37.5665"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 37.5665)}
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
                    <Label htmlFor={`longitude-${index}`}>경도</Label>
                    <Controller
                      name={`workplaceLocations.${index}.coordinates.longitude`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            {...field}
                            id={`longitude-${index}`}
                            type="number"
                            step="any"
                            placeholder="126.9780"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 126.9780)}
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
                  <Label>주소 정보</Label>
                  <div className="space-y-2">
                    <Controller
                      name={`workplaceLocations.${index}.address.roadAddress`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="도로명주소"
                          readOnly
                          className="bg-gray-50"
                        />
                      )}
                    />
                    <Controller
                      name={`workplaceLocations.${index}.address.detailAddress`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="상세주소"
                        />
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hours" className="space-y-4">
                <h5 className="font-medium flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>근무 시간 설정</span>
                </h5>
                
                <div className="space-y-4">
                  {daysOfWeek.map((day) => (
                    <div key={day.key} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="w-16 text-sm font-medium">
                        {day.label}
                      </div>
                      
                      <Controller
                        name={`workplaceLocations.${index}.businessHours.${day.key}.isWorkingDay`}
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      
                      <div className="flex items-center space-x-2 flex-1">
                        <Controller
                          name={`workplaceLocations.${index}.businessHours.${day.key}.start`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="time"
                              className="w-28"
                            />
                          )}
                        />
                        <span className="text-sm text-muted-foreground">~</span>
                        <Controller
                          name={`workplaceLocations.${index}.businessHours.${day.key}.end`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="time"
                              className="w-28"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ))}

      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          <strong>GPS 기반 출근 체크:</strong> 설정한 위치와 반경 내에서만 출근 체크가 가능합니다. 
          정확한 사업장 위치를 설정해주세요.
        </AlertDescription>
      </Alert>
    </div>
  )
}