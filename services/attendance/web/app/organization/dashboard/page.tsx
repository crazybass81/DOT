'use client'

/**
 * Organization Admin Dashboard
 * 조직 관리자 대시보드
 */

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs'
import { Alert, AlertDescription } from '@/src/components/ui/alert'
import { Progress } from '@/src/components/ui/progress'
import { 
  Building2,
  Users,
  MapPin,
  FileText,
  QrCode,
  Mail,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Settings,
  Eye,
  Download
} from 'lucide-react'
import { DocumentUploadSection } from '@/src/components/korean-business/DocumentUploadSection'

interface DashboardData {
  organization: {
    id: string
    name: string
    businessRegistration: {
      businessNumber: string
      businessName: string
      verificationStatus: string
    }
    verificationStatus: string
  }
  employeeStats: {
    totalEmployees: number
    activeEmployees: number
    pendingInvitations: number
  }
  attendanceStats: {
    todayPresent: number
    todayTotal: number
    todayAttendanceRate: number
    monthlyAverageRate: number
  }
  workplaceLocations: Array<{
    id: string
    name: string
    address: any
    isActive: boolean
  }>
  pendingInvitations: Array<{
    id: string
    inviteeName: string
    role: string
    createdAt: string
    expiresAt: string
  }>
  recentDocuments: Array<{
    id: string
    documentType: string
    fileName: string
    verificationStatus: string
    uploadedAt: string
  }>
}

export default function OrganizationDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 조직 ID는 실제로는 URL에서 가져오거나 컨텍스트에서 가져와야 함
      const organizationId = 'your-org-id' // 임시값

      const response = await fetch(`/api/korean-business/organizations?id=${organizationId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '대시보드 데이터를 불러오는데 실패했습니다')
      }

      setDashboardData(result.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            인증 완료
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            검토 중
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            인증 실패
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            문서 업로드 필요
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p>대시보드 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!dashboardData) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>대시보드 데이터를 찾을 수 없습니다.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dashboardData.organization.name}</h1>
          <p className="text-muted-foreground">
            사업자등록번호: {dashboardData.organization.businessRegistration.businessNumber}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getVerificationStatusBadge(dashboardData.organization.verificationStatus)}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
        </div>
      </div>

      {/* 인증 경고 */}
      {dashboardData.organization.verificationStatus !== 'verified' && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <strong>사업자 인증이 필요합니다.</strong> 
            모든 기능을 사용하려면 사업자등록증을 업로드하고 인증을 완료해주세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 메인 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 직원</p>
                <p className="text-2xl font-bold">{dashboardData.employeeStats.totalEmployees}명</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">오늘 출근</p>
                <p className="text-2xl font-bold">{dashboardData.attendanceStats.todayPresent}명</p>
                <p className="text-xs text-muted-foreground">
                  총 {dashboardData.attendanceStats.todayTotal}명 중
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">출석률 (오늘)</p>
                <p className="text-2xl font-bold">{dashboardData.attendanceStats.todayAttendanceRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">대기 중인 초대</p>
                <p className="text-2xl font-bold">{dashboardData.employeeStats.pendingInvitations}건</p>
              </div>
              <Mail className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 탭 콘텐츠 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="employees">직원 관리</TabsTrigger>
          <TabsTrigger value="locations">사업장</TabsTrigger>
          <TabsTrigger value="documents">문서 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 월별 출석률 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">월별 출석 현황</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>평균 출석률</span>
                    <span className="font-bold">{dashboardData.attendanceStats.monthlyAverageRate}%</span>
                  </div>
                  <Progress value={dashboardData.attendanceStats.monthlyAverageRate} />
                  
                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-sm">
                      <span>정상 출근</span>
                      <span>{Math.round(dashboardData.attendanceStats.monthlyAverageRate)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>지각</span>
                      <span>{Math.round((100 - dashboardData.attendanceStats.monthlyAverageRate) * 0.7)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>결근</span>
                      <span>{Math.round((100 - dashboardData.attendanceStats.monthlyAverageRate) * 0.3)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 최근 활동 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">최근 활동</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">김직원 출근 (09:00)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">새로운 직원 초대 발송</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">사업자등록증 검토 중</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">직원 관리</h2>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>직원 초대</span>
            </Button>
          </div>

          {/* 대기 중인 초대 */}
          {dashboardData.pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">대기 중인 초대</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{invitation.inviteeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {invitation.role} • 만료: {new Date(invitation.expiresAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">사업장 관리</h2>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              사업장 추가
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardData.workplaceLocations.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{location.name}</h3>
                    <Badge variant={location.isActive ? "default" : "outline"}>
                      {location.isActive ? "활성" : "비활성"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{location.address.roadAddress}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        지도에서 보기
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        설정
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <h2 className="text-xl font-semibold">문서 관리</h2>

          {/* 업로드된 문서 목록 */}
          {dashboardData.recentDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">업로드된 문서</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.documentType === 'business_certificate' ? '사업자등록증' : '법인인감증명서'} • 
                            {new Date(doc.uploadedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getVerificationStatusBadge(doc.verificationStatus)}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 문서 업로드 섹션 */}
          <DocumentUploadSection
            organizationId={dashboardData.organization.id}
            onUploadComplete={(documents) => {
              // 업로드 완료 후 대시보드 데이터 새로고침
              loadDashboardData()
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}