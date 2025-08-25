// 处理浏览器扩展冲突的全局处理器

export function handleExtensionConflicts() {
  if (typeof window === 'undefined') return

  // 重写console.error以过滤扩展错误
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    
    // 过滤已知的扩展冲突错误
    if (message.includes('Cannot redefine property: conflux') ||
        message.includes('chrome-extension://') ||
        args.some(arg => arg?.stack?.includes('chrome-extension://'))) {
      return // 静默处理扩展错误
    }
    
    originalConsoleError.apply(console, args)
  }

  // 全局错误处理
  window.addEventListener('error', (event) => {
    if (event.message?.includes('Cannot redefine property: conflux') ||
        event.message?.includes('conflux') ||
        event.filename?.includes('chrome-extension://')) {
      
      console.warn('Browser extension conflict detected and handled')
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  }, true)

  // 未处理的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || ''
    if (reason.includes('conflux') || reason.includes('chrome-extension://')) {
      console.warn('Extension-related promise rejection handled')
      event.preventDefault()
    }
  })

  // 阻止扩展重定义全局属性
  try {
    if ((window as any).conflux) {
      Object.defineProperty(window, 'conflux', {
        configurable: false,
        writable: false,
        value: (window as any).conflux
      })
    }
  } catch (error) {
    // 静默处理属性定义错误
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  handleExtensionConflicts()
}