'use client';

import { ReactNode, useState, useEffect } from "react";
import {
  Calendar,
  Loader2,
  Settings,
  Save,
  Clock,
} from "lucide-react";
import { cn } from "@/utils";
import {
  DashboardProvider,
  useDashboard,
} from "@/lib/context/dashboard-context";
import { useCampaigns } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { useAppDispatch } from '@/store/hooks';
// Adjust this path to wherever your baseApi is defined
import { baseApi } from '@/services/api/baseApi';

import { CampaignSidebar } from "./components/campaign-sidebar/campaign-sidebar";
import { Button } from "@/design-system/buttons";

import DaypartingPage  from "./dayparting/page";
import ScheduledCampaignsPage from "./scheduled/page";
import { useAmazonAuth } from '@/hooks/user-amazon-auth'
import { AmazonAuthModal } from '@/components/amazon-auth-modal/amazon-auth-modal'

type View = "dayparting" | "scheduled";

const navigation = [
  { name: "Dayparting", icon: Calendar, view: "dayparting" as View },
  { name: "Scheduled Campaigns", icon: Clock, view: "scheduled" as View },
];

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { selectedCampaign, handleSave, isSaving, setIsSaving } = useDashboard();
  const [activeView, setActiveView] = useState<View>("dayparting");
  const dispatch = useAppDispatch();
  
  const { isConnected, showAuthModal, handleAuthSuccess, handleAuthError, setShowAuthModal } = useAmazonAuth();

  const campaignsQuery = useCampaigns({
    type: "SPONSORED_PRODUCTS",
    limit: 15,
  });

  const isScheduledPage = activeView === "scheduled";
  const isAuthReady = isConnected && !campaignsQuery.isLoading;

  const selectedCampaignId = selectedCampaign?.id || selectedCampaign?.campaignId;
  useEffect(() => {
    if (selectedCampaignId) {
      setActiveView("dayparting");
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    if (campaignsQuery.data && !campaignsQuery.isError) {
      if (!isConnected) {
        handleAuthSuccess()
      }
      setShowAuthModal(false)
      return
    }

    if (campaignsQuery.isError && campaignsQuery.error && !isConnected) {
      const err = campaignsQuery.error as any
      
      const errorMessage = 
        err?.data?.error || 
        err?.data?.message || 
        err?.message || 
        String(err)
      
      const isAuthError = 
        err?.status === 401 ||
        (err?.status === 500 && (
          errorMessage.includes('No Amazon token') ||
          errorMessage.includes('Amazon Advertising session not found') ||
          errorMessage.includes('Unauthorized') ||
          errorMessage.includes('OAuth state') ||
          errorMessage.includes('session expired')
        ))

      if (isAuthError) {
        handleAuthError()
      }
    }
  }, [
    campaignsQuery.data,
    campaignsQuery.isError,
    campaignsQuery.error,
    isConnected,
    handleAuthSuccess,
    handleAuthError,
    setShowAuthModal,
  ])

  const onSave = async () => {
    setIsSaving(true);
    try {
      await handleSave();
    } catch (err) {
      toast.error("Failed to save schedule. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onAuthSuccess = () => {
    handleAuthSuccess()
    // Invalidate ALL campaign queries so CampaignSidebar refetches too
    // If your endpoint uses a different tag, change 'Campaigns' below
    // Common alternatives: ['AmazonAccounts'], ['Campaign'], ['SP']
    dispatch(baseApi.util.invalidateTags(['Campaigns']))
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-[#F8FAFC] dark:bg-zinc-950">
      
      {showAuthModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <AmazonAuthModal
            isOpen={showAuthModal}
            onSuccess={onAuthSuccess}
          />
        </div>
      )}

      <div className="flex w-16 flex-col items-center border-r bg-white dark:bg-zinc-900 py-4 dark:border-zinc-800 relative z-[999]">
        <nav className="flex flex-1 flex-col items-center space-y-4">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => isAuthReady && setActiveView(item.view)}
              disabled={!isAuthReady}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                activeView === item.view
                  ? "bg-indigo-50 text-primary-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800",
                !isAuthReady && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-zinc-400 dark:hover:bg-transparent"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="absolute left-14 hidden rounded-md bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block">
                {item.name}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col items-center space-y-4">
          <button 
            disabled={!isAuthReady}
            className={cn(
              "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200",
              !isAuthReady && "cursor-not-allowed opacity-40 hover:text-zinc-400"
            )}
          >
            <Settings className="h-5 w-5" />
          </button>
          <div className={cn("h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800", !isAuthReady && "opacity-40")} />
        </div>
      </div>

      <CampaignSidebar />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <main
          className={cn(
            "min-h-0 flex-1 overflow-auto bg-[#F8FAFC] dark:bg-zinc-950 p-8",
            isSaving && "pointer-events-none"
          )}
        >
          {activeView === "dayparting" ? <DaypartingPage /> : <ScheduledCampaignsPage />}
        </main>

        {!isScheduledPage && (
          <div className="fixed bottom-8 right-8 z-40">
            <Button
              className="bg-indigo-600 text-white disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider initialCampaigns={[]}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}