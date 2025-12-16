/**
 * API Configuration for USOSWEB Frontend
 * 
 * This module handles API URL resolution that works both at build-time and runtime.
 * In Next.js, NEXT_PUBLIC_* variables are embedded at build time, so we need
 * a runtime solution for Kubernetes deployments.
 */

/**
 * Get the API base URL
 * - In browser (production): returns empty string for relative paths
 * - In browser (development): returns localhost URL
 * - On server-side: uses environment variable or K8s service URL
 * 
 * Usage: fetch(`${API_BASE}/api/auth/login`)
 * - Production: /api/auth/login (relative path, Ingress proxies to api-gateway)
 * - Development: http://localhost:8083/api/auth/login
 */
export function getApiBaseUrl(): string {
  // Client-side
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production: use relative paths (empty string)
    // Requests like /api/auth/login will be handled by Ingress
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '';  // Relative path - /api/auth/login
    }
    
    // Development: use env variable or localhost
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083';
  }
  
  // Server-side: use env variable or K8s service URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://api-gateway-service:8083';
}

/**
 * API Base URL - can be used directly in components
 * Note: For dynamic resolution, prefer using getApiBaseUrl() function
 */
export const API_BASE = getApiBaseUrl();

/**
 * Build full API endpoint URL
 * @param endpoint - API endpoint path (e.g., '/api/auth/login')
 */
export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

