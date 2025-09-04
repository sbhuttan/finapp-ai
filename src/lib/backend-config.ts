/**
 * Backend configuration utility
 * Determines whether to use Python backend or Next.js API routes
 */

export const BACKEND_CONFIG = {
  type: (typeof window !== 'undefined' ? 
    process.env.NEXT_PUBLIC_BACKEND_TYPE : 
    process.env.BACKEND_TYPE) || 'nextjs', // 'python' or 'nextjs'
  pythonUrl: (typeof window !== 'undefined' ? 
    process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL : 
    process.env.PYTHON_BACKEND_URL) || 'http://localhost:8000',
  baseUrl: 'http://localhost:8000', // Direct Python backend URL for server-side API routes
} as const

export type BackendType = typeof BACKEND_CONFIG.type

/**
 * Get the appropriate API URL based on backend configuration
 */
export function getApiUrl(endpoint: string): string {
  if (BACKEND_CONFIG.type === 'python') {
    // Use Python backend
    const baseUrl = BACKEND_CONFIG.pythonUrl
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    return `${baseUrl}/${cleanEndpoint}`
  } else {
    // Use Next.js API routes (default)
    return endpoint
  }
}

/**
 * Check if Python backend is available
 */
export async function isPythonBackendHealthy(): Promise<boolean> {
  if (BACKEND_CONFIG.type !== 'python') {
    return false
  }
  
  try {
    const response = await fetch(`${BACKEND_CONFIG.pythonUrl}/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    return response.ok
  } catch (error) {
    console.warn('Python backend health check failed:', error)
    return false
  }
}

/**
 * Enhanced fetch that automatically routes to the correct backend
 */
export async function backendFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(endpoint)
  
  console.log(`🔗 Backend request: ${BACKEND_CONFIG.type} → ${url}`)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`)
    }
    
    return response
  } catch (error) {
    console.error(`❌ Backend request failed (${BACKEND_CONFIG.type}):`, error)
    throw error
  }
}
