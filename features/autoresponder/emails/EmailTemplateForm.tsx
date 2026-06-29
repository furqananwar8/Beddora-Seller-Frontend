'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Textarea } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { EmailTemplate } from '@/types/emailTemplates.types'

export interface EmailTemplateFormProps {
  template?: EmailTemplate | null
  onSubmit: (payload: Partial<EmailTemplate>) => void
  onReset?: () => void
  isLoading?: boolean
}

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  template,
  onSubmit,
  onReset,
  isLoading,
}) => {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [marketplaceId, setMarketplaceId] = useState('')
  const [productId, setProductId] = useState('')
  const [sku, setSku] = useState('')
  const [purchaseType, setPurchaseType] = useState('')
  const [variablesJson, setVariablesJson] = useState('')
  const [variablesError, setVariablesError] = useState<string | null>(null)

  useEffect(() => {
    if (template) {
      setName(template.name)
      setSubject(template.subject)
      setBody(template.body)
      setMarketplaceId(template.marketplaceId || '')
      setProductId(template.productId || '')
      setSku(template.sku || '')
      setPurchaseType(template.purchaseType || '')
      setVariablesJson(template.variables ? JSON.stringify(template.variables, null, 2) : '')
      setVariablesError(null)
      return
    }

    setName('')
    setSubject('')
    setBody('')
    setMarketplaceId('')
    setProductId('')
    setSku('')
    setPurchaseType('')
    setVariablesJson('')
    setVariablesError(null)
  }, [template])

  const handleSubmit = () => {
    let parsedVariables: EmailTemplate['variables'] | undefined
    if (variablesJson.trim()) {
      try {
        parsedVariables = JSON.parse(variablesJson)
        setVariablesError(null)
      } catch (error) {
        setVariablesError('Variables must be valid JSON.')
        return
      }
    }

    onSubmit({
      name,
      subject,
      body,
      marketplaceId: marketplaceId || undefined,
      productId: productId || undefined,
      sku: sku || undefined,
      purchaseType: purchaseType || undefined,
      variables: parsedVariables,
    })
  }

  const handleReset = () => {
    setName('')
    setSubject('')
    setBody('')
    setMarketplaceId('')
    setProductId('')
    setSku('')
    setPurchaseType('')
    setVariablesJson('')
    setVariablesError(null)
    onReset?.()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template ? 'Edit Template' : 'Create Template'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Template Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input
            label="Marketplace ID (optional)"
            value={marketplaceId}
            onChange={(e) => setMarketplaceId(e.target.value)}
          />
          <Input
            label="Product ID (optional)"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <Input label="SKU (optional)" value={sku} onChange={(e) => setSku(e.target.value)} />
          <Input
            label="Purchase Type (optional)"
            value={purchaseType}
            onChange={(e) => setPurchaseType(e.target.value)}
          />
        </div>
        <Textarea label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        <Textarea
          label="Template Variables (JSON)"
          value={variablesJson}
          onChange={(e) => {
            setVariablesJson(e.target.value)
            setVariablesError(null)
          }}
          rows={6}
        />
        {variablesError ? <div className="text-danger-600 text-sm">{variablesError}</div> : null}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name || !subject || !body}>
            {isLoading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

