"use client";

import AmazonIcon from "@/components/icons/amazon";
import { Button } from "@/design-system/buttons";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAmazonAuth } from "@/hooks/user-amazon-auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const hasShownToast = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useAmazonAuth();

  // If already connected to Amazon, redirect to dashboard
  useEffect(() => {
    if (isConnected) {
      router.replace("/dashboard");
    }
  }, [isConnected, router]);

  // Handle OAuth callback results (success or error)
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const sessionId = searchParams.get('sessionId');
    const email = searchParams.get('email');

    // OAuth succeeded — store session and notify parent/close popup
    if (success === 'true') {
      if (sessionId) {
        localStorage.setItem('amazon_session_id', sessionId);
        localStorage.setItem('amazon_auth_timestamp', String(Date.now()));
      }
      if (email) localStorage.setItem('amazon_email', email);

      // Notify opener/dashboard via BroadcastChannel
      try {
        const bc = new BroadcastChannel('amazon_auth');
        bc.postMessage({ type: 'AMAZON_AUTH_SUCCESS', sessionId, email });
        bc.close();
      } catch (e) {
        console.log('BroadcastChannel failed:', e);
      }

      // Notify opener via postMessage (for popup flow)
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(
            { type: 'AMAZON_AUTH_SUCCESS', sessionId, email },
            window.location.origin
          );
        } catch (e) {
          console.log('postMessage failed:', e);
        }
      }

      // Close popup after brief delay so messages go through
      setTimeout(() => {
        window.close();
      }, 800);

      return;
    }

    // Handle errors
    if (error && !hasShownToast.current) {
      hasShownToast.current = true;
      
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('message');
      url.searchParams.delete('success');
      url.searchParams.delete('sessionId');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());

      switch (error) {
        case 'NOT_INVITED':
          toast.error('Access Denied', {
            description: message ? decodeURIComponent(message) : 'Your email is not invited. Please contact your admin.',
            duration: 6000,
          });
          break;
        case 'STATE_MISMATCH':
          toast.error('Security Error', {
            description: message ? decodeURIComponent(message) : 'Request validation failed. Please try again.',
            duration: 4000,
          });
          break;
        case 'SESSION_EXPIRED':
          toast.warning('Session Expired', {
            description: 'Your session expired. Please try logging in again.',
            duration: 4000,
          });
          break;
        case 'INVALID_STATE':
          toast.error('Security Error', {
            description: 'Invalid request. Please try again.',
            duration: 4000,
          });
          break;
        default:
          toast.error('Authentication Failed', {
            description: message ? decodeURIComponent(message) : 'Something went wrong. Please try again.',
            duration: 4000,
          });
      }
    }
  }, [searchParams]);

  const handleLoginWithAmazon = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/amazon/login", {
        credentials: "include",
      });

      console.dir(res, { depth: null })

      if (!res.ok) {
        throw new Error(`Failed to initiate login: ${res.status}`);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.dir(err, { depth: null })
      toast.error("Failed to start login. Please try again.");
      setLoading(false);
    }
  };

  // Don't render the login form if already connected (redirecting)
  if (isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center space-y-2">
          <div className="flex flex-col items-center">
            <Image src="/beddora-logo.svg" alt="Beddora" width={300} height={300} />
            <p>Campaign Management Tool</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome Back
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Login to access your campaigns
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleLoginWithAmazon}
            disabled={loading}
            size="lg"
            className="bg-[#FF9900] text-black hover:bg-[#FF9900]/90 border-transparent dark:bg-[#FF9900] dark:text-black dark:hover:bg-[#FF9900]/80 w-full h-12 text-lg font-semibold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <AmazonIcon />
                Continue with Amazon
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}