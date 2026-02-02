'use client'

import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

export const EnrichBookButton: React.FC = () => {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEnrich = async () => {
    try {
      setLoading(true)
      setMessage(null)
      setError(null)

      const response = await fetch(`/api/books/${id}/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('payload-token')}`
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(`✨ Enriched ${data.fieldsUpdated} fields from ${data.source}`)
        // Reload the document to show updated fields
        window.location.reload()
      } else {
        setError(data.error || data.message || 'Enrichment failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '12px', marginBottom: '12px' }}>
      <button
        onClick={handleEnrich}
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        {loading ? '🔄 Enriching...' : '🔍 Refresh from ISBNdb/Google Books'}
      </button>

      {message && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          ❌ {error}
        </div>
      )}
    </div>
  )
}
