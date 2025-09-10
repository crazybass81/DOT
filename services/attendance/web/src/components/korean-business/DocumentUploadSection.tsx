'use client'

/**
 * Document Upload Section Component
 * 사업자등록증 업로드 섹션
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye,
  Download
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface DocumentFile {
  file: File
  preview: string
  uploaded: boolean
  uploading: boolean
  url?: string
  error?: string
}

interface DocumentUploadSectionProps {
  organizationId: string
  onUploadComplete?: (documents: any[]) => void
  className?: string
}

export function DocumentUploadSection({
  organizationId,
  onUploadComplete,
  className
}: DocumentUploadSectionProps) {
  const [businessCertificate, setBusinessCertificate] = useState<DocumentFile | null>(null)
  const [corporateSeal, setCorporateSeal] = useState<DocumentFile | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDropBusinessCertificate = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const preview = URL.createObjectURL(file)
      setBusinessCertificate({
        file,
        preview,
        uploaded: false,
        uploading: false
      })
    }
  }, [])

  const onDropCorporateSeal = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const preview = URL.createObjectURL(file)
      setCorporateSeal({
        file,
        preview,
        uploaded: false,
        uploading: false
      })
    }
  }, [])

  const businessCertDropzone = useDropzone({
    onDrop: onDropBusinessCertificate,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const corporateSealDropzone = useDropzone({
    onDrop: onDropCorporateSeal,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const uploadDocument = async (
    documentFile: DocumentFile, 
    documentType: 'business_certificate' | 'corporate_seal',
    setDocument: React.Dispatch<React.SetStateAction<DocumentFile | null>>
  ) => {
    setDocument(prev => prev ? { ...prev, uploading: true, error: undefined } : null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', documentFile.file)
      formData.append('organizationId', organizationId)
      formData.append('documentType', documentType)

      const response = await fetch('/api/korean-business/documents/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent: any) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100
          setUploadProgress(progress)
        }
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '파일 업로드에 실패했습니다')
      }

      setDocument(prev => prev ? {
        ...prev,
        uploaded: true,
        uploading: false,
        url: result.data.fileUrl
      } : null)

      setUploadProgress(100)

      // 업로드 완료 콜백 호출
      if (onUploadComplete) {
        onUploadComplete([result.data])
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      setDocument(prev => prev ? {
        ...prev,
        uploading: false,
        error: errorMessage
      } : null)
    } finally {
      setUploadProgress(0)
    }
  }

  const removeDocument = (
    setDocument: React.Dispatch<React.SetStateAction<DocumentFile | null>>
  ) => {
    setDocument(null)
  }

  const renderDropzone = (
    dropzone: any,
    document: DocumentFile | null,
    title: string,
    description: string,
    documentType: 'business_certificate' | 'corporate_seal',
    setDocument: React.Dispatch<React.SetStateAction<DocumentFile | null>>
  ) => (
    <Card className="w-full">
      <CardHeader>
        <h4 className="text-base font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {!document ? (
          <div
            {...dropzone.getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dropzone.isDragActive
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <input {...dropzone.getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {dropzone.isDragActive ? (
              <p className="text-sm">파일을 여기에 놓아주세요...</p>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">
                  파일을 끌어다 놓거나 클릭하여 업로드
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF, PDF (최대 10MB)
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{document.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(document.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {document.uploaded && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    업로드 완료
                  </Badge>
                )}
                
                {document.error && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    오류
                  </Badge>
                )}

                {document.uploaded && document.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(setDocument)}
                  disabled={document.uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {document.uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>업로드 중...</span>
                  <span>{uploadProgress.toFixed(0)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {document.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{document.error}</AlertDescription>
              </Alert>
            )}

            {!document.uploaded && !document.uploading && !document.error && (
              <Button
                onClick={() => uploadDocument(document, documentType, setDocument)}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                업로드
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center space-x-2">
        <FileText className="h-5 w-5" />
        <h3 className="text-lg font-semibold">사업자등록증 업로드</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderDropzone(
          businessCertDropzone,
          businessCertificate,
          "사업자등록증",
          "사업자등록증 사본을 업로드해주세요",
          "business_certificate",
          setBusinessCertificate
        )}

        {renderDropzone(
          corporateSealDropzone,
          corporateSeal,
          "법인인감증명서",
          "법인인감증명서를 업로드해주세요 (법인인 경우)",
          "corporate_seal",
          setCorporateSeal
        )}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>문서 검증 안내:</strong>
          <ul className="mt-2 space-y-1">
            <li>• 업로드된 문서는 관리자 검토 후 승인됩니다</li>
            <li>• 검증 완료까지 1-2 영업일이 소요될 수 있습니다</li>
            <li>• 문서가 불분명하거나 정보가 일치하지 않는 경우 재업로드를 요청할 수 있습니다</li>
            <li>• 승인된 조직만 모든 기능을 사용할 수 있습니다</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}