import React from 'react'

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
    </div>
  )
}