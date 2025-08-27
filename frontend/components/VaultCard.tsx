import React from 'react'
import { formatBalance } from '../hooks/useVault'

interface VaultCardProps {
  title: string
  stats: Array<{
    label: string
    value: string | React.ReactNode
    highlight?: boolean
  }>
  className?: string
}

export function VaultCard({ title, stats, className = '' }: VaultCardProps) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-gray-400">{stat.label}</span>
            <span className={`font-mono ${stat.highlight ? 'text-green-400' : ''}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TransactionCardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function TransactionCard({ title, children, className = '' }: TransactionCardProps) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

interface InputFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  error?: string
  className?: string
}

export function InputField({
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  className = '',
}: InputFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      onChange(val)
    }
  }

  return (
    <div className="w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'ring-2 ring-red-500' : ''
        } ${className}`}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  )
}

interface ActionButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'warning'
  children: React.ReactNode
  className?: string
}

export function ActionButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  className = '',
}: ActionButtonProps) {
  const baseClass = 'w-full py-3 rounded-lg font-semibold transition'
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600',
    secondary: 'bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600',
    warning: 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClass} ${variantClasses[variant]} disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          处理中...
        </span>
      ) : (
        children
      )}
    </button>
  )
}

interface AlertProps {
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  onClose?: () => void
  className?: string
}

export function Alert({ type, message, onClose, className = '' }: AlertProps) {
  const typeClasses = {
    info: 'bg-blue-900/30 border-blue-600/50 text-blue-400',
    warning: 'bg-yellow-900/30 border-yellow-600/50 text-yellow-400',
    error: 'bg-red-900/30 border-red-600/50 text-red-400',
    success: 'bg-green-900/30 border-green-600/50 text-green-400',
  }

  const icons = {
    info: '💡',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  }

  return (
    <div className={`border rounded-lg p-4 ${typeClasses[type]} ${className}`}>
      <div className="flex justify-between items-center">
        <span>
          {icons[type]} {message}
        </span>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-4">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}