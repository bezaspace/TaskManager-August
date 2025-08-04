"use client";

import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Don't show logout button on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Logout button - positioned absolutely in top right */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          variant="outline"
          size="sm"
          className="border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {loggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
      
      {/* Main content */}
      {children}
    </>
  );
}