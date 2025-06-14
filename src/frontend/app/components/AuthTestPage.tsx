'use client'
import React, { useState } from 'react';

interface AuthResponse {
  success: boolean;
  message: string;
  expiresIn?: number; // Only expiration time from backend
}

interface AuthState {
  isAuthenticated: boolean;
  expiresIn: number | null;
}

const AuthTestPage: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    expiresIn: null
  });

  const [loading, setLoading] = useState({
    login: false,
    register: false,
    refresh: false,
    hello: false
  });

  const [responses, setResponses] = useState({
    login: null as AuthResponse | null,
    register: null as AuthResponse | null,
    refresh: null as AuthResponse | null,
    hello: null as any
  });

  const [loginForm, setLoginForm] = useState({ name: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', password: '' });

  // API call helper with credentials: 'include' for cookies
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    const config: RequestInit = {
      method,
      credentials: 'include', // CRITICAL: Include cookies in requests
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return fetch(`http://localhost:8083${endpoint}`, config);
  };

  const handleLogin = async () => {
    setLoading(prev => ({ ...prev, login: true }));
    try {
      const response = await apiCall('/api/auth/login', 'POST', loginForm);
      const data = await response.json();

      setResponses(prev => ({ ...prev, login: data }));

      if (data.success && data.expiresIn) {
        setAuthState({
          isAuthenticated: true,
          expiresIn: data.expiresIn
        });

        // Optional: Set expiration timer
        setTimeout(() => {
          setAuthState(prev => ({ ...prev, isAuthenticated: false }));
        }, data.expiresIn * 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
    setLoading(prev => ({ ...prev, login: false }));
  };

  const handleRegister = async () => {
    setLoading(prev => ({ ...prev, register: true }));
    try {
      const response = await apiCall('/api/auth/register', 'POST', registerForm);
      const data = await response.json();
      setResponses(prev => ({ ...prev, register: data }));
    } catch (error) {
      console.error('Register error:', error);
    }
    setLoading(prev => ({ ...prev, register: false }));
  };

  const handleRefreshToken = async () => {
    setLoading(prev => ({ ...prev, refresh: true }));
    try {
      const response = await apiCall('/api/auth/refresh', 'POST');
      const data = await response.json();

      setResponses(prev => ({ ...prev, refresh: data }));

      if (data.success && data.expiresIn) {
        setAuthState({
          isAuthenticated: true,
          expiresIn: data.expiresIn
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setLoading(prev => ({ ...prev, refresh: false }));
  };

  const handleLogout = async () => {
    try {
      const response = await apiCall('/api/auth/logout', 'POST');
      const data = await response.json();

      if (data.success) {
        setAuthState({
          isAuthenticated: false,
          expiresIn: null
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleHello = async () => {
    setLoading(prev => ({ ...prev, hello: true }));
    try {
      const response = await apiCall('/api/hello');
      const data = await response.json();
      setResponses(prev => ({ ...prev, hello: data }));
    } catch (error) {
      console.error('Hello error:', error);
    }
    setLoading(prev => ({ ...prev, hello: false }));
  };

  // Component styles (same as before)
  const containerStyle = { padding: '20px', fontFamily: 'Arial, sans-serif' };
  const sectionStyle = { marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' };
  const inputStyle = { margin: '5px', padding: '8px', width: '200px' };
  const buttonStyle = { margin: '10px', padding: '10px 15px', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <h1>🍪 Cookie-Based Authentication Test</h1>

      {/* Auth Status */}
      <div style={{ ...sectionStyle, backgroundColor: authState.isAuthenticated ? '#d4edda' : '#f8d7da' }}>
        <h2>Authentication Status</h2>
        <p><strong>Status:</strong> {authState.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</p>
        {authState.expiresIn && (
          <p><strong>Token expires in:</strong> {authState.expiresIn} seconds</p>
        )}
      </div>

      {/* Register */}
      <div style={sectionStyle}>
        <h2>1. Register User</h2>
        <div>
          <input
            type="text"
            placeholder="Name"
            value={registerForm.name}
            onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={registerForm.password}
            onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={loading.register}
          style={{ ...buttonStyle, backgroundColor: loading.register ? '#ccc' : '#28a745', color: 'white' }}
        >
          {loading.register ? 'Registering...' : 'Register User'}
        </button>
      </div>

      {/* Login */}
      <div style={sectionStyle}>
        <h2>2. Login User</h2>
        <div>
          <input
            type="text"
            placeholder="Name"
            value={loginForm.name}
            onChange={(e) => setLoginForm(prev => ({ ...prev, name: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <button
          onClick={handleLogin}
          disabled={loading.login}
          style={{ ...buttonStyle, backgroundColor: loading.login ? '#ccc' : '#007bff', color: 'white' }}
        >
          {loading.login ? 'Logging in...' : 'Login'}
        </button>
      </div>

      {/* Actions */}
      <div style={sectionStyle}>
        <h2>3. Actions</h2>
        <button
          onClick={handleRefreshToken}
          disabled={loading.refresh}
          style={{ ...buttonStyle, backgroundColor: loading.refresh ? '#ccc' : '#6f42c1', color: 'white' }}
        >
          {loading.refresh ? 'Refreshing...' : 'Refresh Token'}
        </button>

        <button
          onClick={handleLogout}
          style={{ ...buttonStyle, backgroundColor: '#dc3545', color: 'white' }}
        >
          Logout
        </button>

        <button
          onClick={handleHello}
          disabled={loading.hello}
          style={{ ...buttonStyle, backgroundColor: loading.hello ? '#ccc' : '#17a2b8', color: 'white' }}
        >
          {loading.hello ? 'Loading...' : 'Test Protected Route'}
        </button>
      </div>

      {/* Responses */}
      <div style={sectionStyle}>
        <h2>4. Responses</h2>
        <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(responses, null, 2)}
        </pre>
      </div>

      {/* Instructions */}
      <div style={{ backgroundColor: '#d1ecf1', padding: '15px', border: '1px solid #bee5eb', borderRadius: '5px' }}>
        <h3>🍪 Cookie-Based Benefits:</h3>
        <ul>
          <li>✅ No manual token management</li>
          <li>✅ HTTP-only cookies protect against XSS</li>
          <li>✅ Automatic cookie inclusion in requests</li>
          <li>✅ Only expiration time exposed to frontend</li>
          <li>✅ Backend has full control over tokens</li>
        </ul>
      </div>
    </div>
  );
};

export default AuthTestPage;
