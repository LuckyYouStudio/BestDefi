import { useEffect, useState } from 'react'

export default function ExtensionWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [hasConflux, setHasConflux] = useState(false)

  useEffect(() => {
    // 检查是否存在conflux相关的扩展冲突
    const checkExtensions = () => {
      try {
        // 检查全局对象是否被扩展污染
        if (typeof window !== 'undefined') {
          const hasConfluxExt = !!(window as any).conflux || 
                               document.querySelectorAll('script[src*="chrome-extension"]').length > 0
          
          setHasConflux(hasConfluxExt)
          
          // 监听错误事件
          const handleError = (event: ErrorEvent) => {
            if (event.message && 
                (event.message.includes('Cannot redefine property: conflux') ||
                 event.message.includes('conflux') ||
                 event.filename?.includes('chrome-extension://'))) {
              setShowWarning(true)
              // 阻止错误传播
              event.preventDefault()
              return false
            }
          }

          window.addEventListener('error', handleError)
          
          return () => {
            window.removeEventListener('error', handleError)
          }
        }
      } catch (error) {
        console.warn('Extension check failed:', error)
      }
    }

    checkExtensions()
  }, [])

  if (!showWarning && !hasConflux) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white p-3 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold">检测到浏览器扩展冲突</p>
            <p className="text-sm">
              某些Chrome扩展（如Conflux钱包）可能影响页面显示，但不影响实际功能
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWarning(false)}
            className="px-3 py-1 bg-yellow-700 hover:bg-yellow-800 rounded text-sm"
          >
            知道了
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-yellow-700 hover:bg-yellow-800 rounded text-sm"
          >
            刷新页面
          </button>
        </div>
      </div>
    </div>
  )
}