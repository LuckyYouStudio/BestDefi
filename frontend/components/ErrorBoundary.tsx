import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('ErrorBoundary caught an error:', error, errorInfo)
    
    // 如果是扩展冲突错误，忽略它
    if (error.message.includes('Cannot redefine property') || 
        error.message.includes('conflux') ||
        error.stack?.includes('chrome-extension://')) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 检查是否是扩展冲突
      const isExtensionError = this.state.error.message.includes('Cannot redefine property') ||
                              this.state.error.message.includes('conflux') ||
                              this.state.error.stack?.includes('chrome-extension://')
      
      if (isExtensionError) {
        // 对于扩展冲突，显示警告但继续渲染
        console.warn('Browser extension conflict detected, continuing anyway...')
        return this.props.children
      }

      // 对于真正的错误，显示错误UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-4">
              {this.state.error.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary