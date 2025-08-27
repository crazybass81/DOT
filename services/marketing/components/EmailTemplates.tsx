'use client'

import { useState } from 'react'
import { emailTemplateEngine } from '@/lib/email-templates'
import { EmailTemplate } from '@/types'

interface EmailTemplatesProps {
  selectedCreators: string[]
}

export default function EmailTemplates({ selectedCreators }: EmailTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({
    creatorName: '',
    restaurantName: '',
    location: '',
    specialMenu: '',
    contactInfo: '',
    productName: '',
    uniquePoint: '',
    atmosphere: '',
    bestTime: '',
    eventName: '',
    eventDate: '',
    eventBenefit: '',
    monthlyBenefit: '',
    duration: '',
  })
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)

  const templates = emailTemplateEngine.getAllTemplates()

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setPreview(null)
  }

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }))
  }

  const handlePreview = () => {
    if (!selectedTemplate) return
    
    const filled = emailTemplateEngine.fillTemplate(selectedTemplate.id, variables)
    if (filled) {
      setPreview(filled)
    }
  }

  const handleSend = () => {
    if (!preview || selectedCreators.length === 0) return
    
    alert(`이메일이 ${selectedCreators.length}명의 크리에이터에게 발송됩니다.`)
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-700',
      review: 'bg-green-100 text-green-700',
      visit: 'bg-purple-100 text-purple-700',
      event: 'bg-orange-100 text-orange-700',
      partnership: 'bg-red-100 text-red-700',
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      general: '일반 협업',
      review: '제품 리뷰',
      visit: '방문 리뷰',
      event: '이벤트',
      partnership: '파트너십',
    }
    return labels[category as keyof typeof labels] || category
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>{selectedCreators.length}명</strong>의 크리에이터가 선택되었습니다.
          {selectedCreators.length === 0 && ' 먼저 크리에이터를 선택해주세요.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">템플릿 선택</h3>
          
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary bg-primary bg-opacity-5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{template.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(template.category)}`}>
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {selectedTemplate && (
            <>
              <h3 className="text-xl font-semibold">변수 입력</h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {variable}
                    </label>
                    <input
                      type="text"
                      value={variables[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={`${variable} 입력`}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handlePreview}
                className="w-full px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors"
              >
                미리보기
              </button>
            </>
          )}
        </div>
      </div>

      {preview && (
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-xl font-semibold">이메일 미리보기</h3>
          
          <div className="bg-white border rounded-lg p-6">
            <div className="border-b pb-3 mb-4">
              <p className="text-sm text-gray-500">제목</p>
              <p className="font-semibold mt-1">{preview.subject}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-2">내용</p>
              <div className="whitespace-pre-wrap text-gray-700">
                {preview.body}
              </div>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={selectedCreators.length === 0}
            className={`w-full px-4 py-3 font-semibold rounded-md transition-colors ${
              selectedCreators.length > 0
                ? 'bg-primary text-white hover:bg-opacity-90'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedCreators.length > 0
              ? `${selectedCreators.length}명에게 이메일 발송`
              : '크리에이터를 선택해주세요'}
          </button>
        </div>
      )}
    </div>
  )
}