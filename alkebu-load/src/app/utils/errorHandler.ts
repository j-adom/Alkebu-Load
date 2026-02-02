interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

interface FailedOperation {
  id: string
  operation: string
  data: any
  error: string
  attempts: number
  lastAttempt: string
  nextRetry: string
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
}

// Exponential backoff retry wrapper
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: Error

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempting ${operationName} (attempt ${attempt}/${config.maxAttempts})`)
      
      const result = await operation()
      
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded after ${attempt} attempts`)
      }
      
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      console.log(`❌ ${operationName} failed (attempt ${attempt}/${config.maxAttempts}):`, lastError.message)
      
      if (attempt === config.maxAttempts) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      )
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay
      const totalDelay = delay + jitter
      
      console.log(`⏱️  Retrying ${operationName} in ${Math.round(totalDelay)}ms...`)
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  console.error(`❌ ${operationName} failed after ${config.maxAttempts} attempts`)
  throw lastError!
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${operationName}`)
      } else {
        this.state = 'HALF_OPEN'
        console.log(`🔄 Circuit breaker moving to HALF_OPEN for ${operationName}`)
      }
    }

    try {
      const result = await operation()
      
      if (this.state === 'HALF_OPEN') {
        this.reset()
        console.log(`✅ Circuit breaker reset to CLOSED for ${operationName}`)
      }
      
      return result
    } catch (error) {
      this.recordFailure()
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN'
        this.lastFailureTime = Date.now()
        console.log(`🚨 Circuit breaker OPENED for ${operationName} after ${this.failures} failures`)
      }
      
      throw error
    }
  }

  private recordFailure() {
    this.failures++
  }

  private reset() {
    this.failures = 0
    this.state = 'CLOSED'
    this.lastFailureTime = 0
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}

// Global circuit breakers for different services
const circuitBreakers = {
  isbndb: new CircuitBreaker(5, 300000), // 5 minutes
  googleBooks: new CircuitBreaker(5, 60000), // 1 minute
  openLibrary: new CircuitBreaker(5, 60000), // 1 minute
  square: new CircuitBreaker(3, 600000), // 10 minutes
  imageDownload: new CircuitBreaker(10, 120000) // 2 minutes
}

export function getCircuitBreaker(service: keyof typeof circuitBreakers) {
  return circuitBreakers[service]
}

// Retry queue for failed operations
class RetryQueue {
  private queue: FailedOperation[] = []
  private processing = false

  add(operation: FailedOperation) {
    console.log(`📝 Adding failed operation to retry queue: ${operation.operation}`)
    this.queue.push(operation)
    
    if (!this.processing) {
      this.processQueue()
    }
  }

  private async processQueue() {
    this.processing = true
    
    while (this.queue.length > 0) {
      const now = new Date().toISOString()
      
      // Find operations ready for retry
      const readyOperations = this.queue.filter(op => op.nextRetry <= now)
      
      if (readyOperations.length === 0) {
        // Wait for next operation to be ready
        const nextOperation = this.queue.reduce((earliest, current) => 
          current.nextRetry < earliest.nextRetry ? current : earliest
        )
        
        const waitTime = new Date(nextOperation.nextRetry).getTime() - Date.now()
        if (waitTime > 0) {
          console.log(`⏱️  Waiting ${Math.round(waitTime / 1000)}s for next retry operation`)
          await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)))
        }
        continue
      }

      // Process ready operations
      for (const operation of readyOperations) {
        await this.processOperation(operation)
      }
    }
    
    this.processing = false
  }

  private async processOperation(operation: FailedOperation) {
    try {
      console.log(`🔄 Retrying failed operation: ${operation.operation} (attempt ${operation.attempts + 1})`)
      
      // This would need to be implemented based on operation type
      await this.executeOperation(operation)
      
      // Remove from queue on success
      this.removeFromQueue(operation.id)
      console.log(`✅ Retry successful for: ${operation.operation}`)
      
    } catch (error) {
      operation.attempts++
      operation.lastAttempt = new Date().toISOString()
      operation.error = error instanceof Error ? error.message : String(error)
      
      if (operation.attempts >= 5) {
        // Max retries reached, remove from queue
        console.log(`❌ Max retries reached for: ${operation.operation}`)
        this.removeFromQueue(operation.id)
        
        // You could send this to a dead letter queue or alert system
        await this.handleFailedOperation(operation)
      } else {
        // Schedule next retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, operation.attempts), 300000) // Max 5 minutes
        operation.nextRetry = new Date(Date.now() + delay).toISOString()
        
        console.log(`⏱️  Scheduling retry #${operation.attempts + 1} for: ${operation.operation}`)
      }
    }
  }

  private async executeOperation(operation: FailedOperation): Promise<void> {
    // This would dispatch to the appropriate handler based on operation type
    switch (operation.operation) {
      case 'enrichProduct':
        // Re-run product enrichment
        break
      case 'downloadImage':
        // Re-run image download
        break
      case 'syncToSquare':
        // Re-run Square sync
        break
      default:
        throw new Error(`Unknown operation type: ${operation.operation}`)
    }
  }

  private removeFromQueue(id: string) {
    this.queue = this.queue.filter(op => op.id !== id)
  }

  private async handleFailedOperation(operation: FailedOperation) {
    // Send to monitoring/alerting system
    console.error(`🚨 Operation permanently failed: ${operation.operation}`, {
      id: operation.id,
      attempts: operation.attempts,
      lastError: operation.error,
      data: operation.data
    })
    
    // You could implement:
    // - Send to external monitoring (DataDog, Sentry, etc.)
    // - Store in database for manual review
    // - Send email/Slack notification
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      processing: this.processing,
      operations: this.queue.map(op => ({
        id: op.id,
        operation: op.operation,
        attempts: op.attempts,
        nextRetry: op.nextRetry
      }))
    }
  }
}

// Global retry queue
const retryQueue = new RetryQueue()

export function addToRetryQueue(operation: Omit<FailedOperation, 'attempts' | 'lastAttempt' | 'nextRetry'>) {
  const failedOperation: FailedOperation = {
    ...operation,
    attempts: 0,
    lastAttempt: new Date().toISOString(),
    nextRetry: new Date(Date.now() + 5000).toISOString() // Retry in 5 seconds
  }
  
  retryQueue.add(failedOperation)
}

export function getRetryQueueStatus() {
  return retryQueue.getQueueStatus()
}

// Error categorization for better handling
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()
  
  if (message.includes('network') || message.includes('timeout') || message.includes('enotfound')) {
    return ErrorCategory.NETWORK
  }
  
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('quota')) {
    return ErrorCategory.RATE_LIMIT
  }
  
  if (message.includes('unauthorized') || message.includes('authentication') || message.includes('api key')) {
    return ErrorCategory.AUTHENTICATION
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return ErrorCategory.NOT_FOUND
  }
  
  if (message.includes('validation') || message.includes('invalid') || message.includes('bad request')) {
    return ErrorCategory.VALIDATION
  }
  
  return ErrorCategory.UNKNOWN
}

// Enhanced error logging with context
export function logError(error: Error, context: Record<string, any>) {
  const category = categorizeError(error)
  
  console.error('❌ Enhanced Error Log:', {
    message: error.message,
    category,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
  
  // You could enhance this to send to external logging services
  // like DataDog, LogRocket, Sentry, etc.
}

// Health check utilities
export function createHealthChecks() {
  return {
    async checkIsbndbHealth(): Promise<boolean> {
      try {
        if (!process.env.ISBNDB_API_KEY) return false
        
        const response = await fetch('https://api2.isbndb.com/book/9781400244102', {
          headers: { 'Authorization': process.env.ISBNDB_API_KEY }
        })
        
        return response.ok
      } catch {
        return false
      }
    },

    async checkSquareHealth(): Promise<boolean> {
      try {
        if (!process.env.SQUARE_ACCESS_TOKEN) return false
        
        const { SquareClient } = await import('square')
        const client = new SquareClient({
          token: process.env.SQUARE_ACCESS_TOKEN,
          environment: process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'
        })
        
        const response = await client.locations.listLocations()
        return !!response.result?.locations
      } catch {
        return false
      }
    },

    async checkOverallHealth(): Promise<{
      status: 'healthy' | 'degraded' | 'unhealthy'
      services: Record<string, boolean>
      circuitBreakers: Record<string, any>
    }> {
      const services = {
        isbndb: await this.checkIsbndbHealth(),
        square: await this.checkSquareHealth()
      }
      
      const circuitBreakerStates = Object.entries(circuitBreakers).reduce(
        (acc, [name, breaker]) => ({
          ...acc,
          [name]: breaker.getState()
        }),
        {}
      )
      
      const healthyServices = Object.values(services).filter(Boolean).length
      const totalServices = Object.keys(services).length
      
      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (healthyServices === totalServices) {
        status = 'healthy'
      } else if (healthyServices > 0) {
        status = 'degraded'
      } else {
        status = 'unhealthy'
      }
      
      return {
        status,
        services,
        circuitBreakers: circuitBreakerStates
      }
    }
  }
}