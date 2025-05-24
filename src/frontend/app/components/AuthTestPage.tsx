"use client"

import React, { useState } from 'react';

const AuthTestPage = () => {
  // Form states
  const [registerForm, setRegisterForm] = useState({ name: '', password: '' });
  const [loginForm, setLoginForm] = useState({ name: '', password: '' });

  // Auth state
  const [tokens, setTokens] = useState({
    accessToken: '',
    refreshToken: '',
    expiresIn: 0
  });

  // Response states for displaying results
  const [responses, setResponses] = useState({
    register: null,
    login: null,
    refresh: null,
    hello: null
  });

  // Loading states
  const [loading, setLoading] = useState({
    register: false,
    login: false,
    refresh: false,
    hello: false
  });

  const API_BASE = 'http://localhost:8083';

  // Helper function to update loading state
  const setLoadingState = (action, state) => {
    setLoading(prev => ({ ...prev, [action]: state }));
  };

  // Helper function to update response state
  const setResponseState = (action, response) => {
    setResponses(prev => ({ ...prev, [action]: response }));
  };

  // Register function
  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.password) {
      setResponseState('register', { error: 'Name and password are required' });
      return;
    }

    setLoadingState('register', true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });

      const data = await response.json();
      setResponseState('register', { success: response.ok, data, status: response.status });

      if (data.success) {
        setRegisterForm({ name: '', password: '' });
      }
    } catch (error) {
      setResponseState('register', { error: error.message });
    } finally {
      setLoadingState('register', false);
    }
  };

  // Login function
  const handleLogin = async () => {
    if (!loginForm.name || !loginForm.password) {
      setResponseState('login', { error: 'Name and password are required' });
      return;
    }

    setLoadingState('login', true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();
      setResponseState('login', { success: response.ok, data, status: response.status });

      if (response.ok && data.access_token) {
        setTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in
        });
        setLoginForm({ name: '', password: '' });
      }
    } catch (error) {
      setResponseState('login', { error: error.message });
    } finally {
      setLoadingState('login', false);
    }
  };

  // Refresh token function
  const handleRefreshToken = async () => {
    if (!tokens.refreshToken) {
      setResponseState('refresh', { error: 'No refresh token available. Please login first.' });
      return;
    }

    setLoadingState('refresh', true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken })
      });

      const data = await response.json();
      setResponseState('refresh', { success: response.ok, data, status: response.status });

      if (response.ok && data.access_token) {
        setTokens({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in
        });
      }
    } catch (error) {
      setResponseState('refresh', { error: error.message });
    } finally {
      setLoadingState('refresh', false);
    }
  };

  // Test hello endpoint
  const handleTestHello = async () => {
    setLoadingState('hello', true);
    try {
      const response = await fetch(`${API_BASE}/api/hello`);
      const data = await response.json();
      setResponseState('hello', { success: response.ok, data, status: response.status });
    } catch (error) {
      setResponseState('hello', { error: error.message });
    } finally {
      setLoadingState('hello', false);
    }
  };

  // Simple response display
  const ResponseDisplay = ({ title, response }) => {
    if (!response) return null;

    const isSuccess = response.success || (!response.error && !response.success);
    const bgColor = isSuccess ? '#d4edda' : '#f8d7da';
    const textColor = isSuccess ? '#155724' : '#721c24';

    return (
      <div style={{ padding: '10px', backgroundColor: bgColor, color: textColor, border: '1px solid', marginTop: '10px', borderRadius: '5px' }}>
        <h4>{title} {response.status && `(${response.status})`}</h4>
        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {response.error || JSON.stringify(response.data, null, 2)}
        </pre>
      </div>
    );
  };

  const buttonStyle = {
    padding: '10px 15px',
    margin: '5px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const inputStyle = {
    padding: '8px',
    margin: '5px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    width: '200px'
  };

  const sectionStyle = {
    border: '1px solid #ddd',
    padding: '20px',
    margin: '20px 0',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9'
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Auth System Test Page</h1>
      <p>Test your authentication endpoints</p>

      {/* Connection Test */}
      <div style={sectionStyle}>
        <h2>1. Connection Test</h2>
        <button
          onClick={handleTestHello}
          disabled={loading.hello}
          style={{ ...buttonStyle, backgroundColor: loading.hello ? '#ccc' : '#007bff', color: 'white' }}
        >
          {loading.hello ? 'Testing...' : 'Test Hello Endpoint'}
        </button>
        <ResponseDisplay title="Hello Response" response={responses.hello} />
      </div>

      {/* Registration */}
      <div style={sectionStyle}>
        <h2>2. Register New User</h2>
        <div>
          <input
            type="text"
            placeholder="Name (required)"
            value={registerForm.name}
            onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password (required)"
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
        <ResponseDisplay title="Registration Response" response={responses.register} />
      </div>

      {/* Login */}
      <div style={sectionStyle}>
        <h2>3. Login User</h2>
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
        <ResponseDisplay title="Login Response" response={responses.login} />
      </div>

      {/* Token Management */}
      <div style={sectionStyle}>
        <h2>4. Token Management</h2>

        <div style={{ backgroundColor: '#e9ecef', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
          <h3>Current Tokens:</h3>
          <div style={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <p><strong>Access Token:</strong> {tokens.accessToken || 'None'}</p>
            <p><strong>Refresh Token:</strong> {tokens.refreshToken || 'None'}</p>
            <p><strong>Expires In:</strong> {tokens.expiresIn ? `${tokens.expiresIn} seconds` : 'N/A'}</p>
          </div>
        </div>

        <button
          onClick={handleRefreshToken}
          disabled={loading.refresh || !tokens.refreshToken}
          style={{ ...buttonStyle, backgroundColor: (loading.refresh || !tokens.refreshToken) ? '#ccc' : '#6f42c1', color: 'white' }}
        >
          {loading.refresh ? 'Refreshing...' : 'Refresh Token'}
        </button>
        <ResponseDisplay title="Token Refresh Response" response={responses.refresh} />
      </div>

      {/* Instructions */}
      <div style={{ backgroundColor: '#d1ecf1', padding: '15px', border: '1px solid #bee5eb', borderRadius: '5px' }}>
        <h3>Testing Steps:</h3>
        <ol>
          <li>Test "Hello" endpoint first</li>
          <li>Register a new user</li>
          <li>Login with same credentials</li>
          <li>Test token refresh</li>
        </ol>
      </div>
    </div>
  );
};

export default AuthTestPage;
