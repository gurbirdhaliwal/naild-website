'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('token', token);
      router.push('/');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <main className="flex items-center justify-center h-screen">
      <p className="text-center text-lg font-medium">Signing you in with Google...</p>
    </main>
  );
}
