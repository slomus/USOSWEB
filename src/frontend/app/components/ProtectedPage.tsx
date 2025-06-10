'use client';
import { ReactNode } from 'react';
import { useRefreshTokenGuard } from '../hooks/useRefreshTokenGuard';

export default function ProtectedPage({ children }: { children: ReactNode }) {
  const { isLoading } = useRefreshTokenGuard();
  if (isLoading) return <div>Ładowanie...</div>;
  return <>{children}</>;
}
