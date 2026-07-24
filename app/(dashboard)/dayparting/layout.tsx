"use client";

import { ReactNode, useState } from "react";
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
  Campaign,
} from "@/lib/context/dashboard-context";
import { useCampaigns } from "@/hooks/useCampaigns";
import { toast } from "sonner";

import { CampaignSidebar } from "./components/campaign-sidebar/campaign-sidebar";
import { Button } from "@/design-system/buttons";

// 1. Extract these from your page files so they can be rendered anywhere
import DaypartingPage  from "./dayparting/page";
import ScheduledCampaignsPage from "./scheduled/page";

type View = "dayparting" | "scheduled";

const navigation = [
  { name: "Dayparting", icon: Calendar, view: "dayparting" as View },
  { name: "Scheduled Campaigns", icon: Clock, view: "scheduled" as View },
];

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { selectedCampaign, handleSave, isSaving, setIsSaving } = useDashboard();
  const [activeView, setActiveView] = useState<View>("dayparting");
  const [executingModalOpen, setExecutingModalOpen] = useState(false);

  const isScheduledPage = activeView === "scheduled";

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

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-zinc-950">
      {/* Primary Sidebar */}
      <div className="flex w-16 flex-col items-center border-r bg-white dark:bg-zinc-900 py-4 dark:border-zinc-800 relative z-[999]">
        <nav className="flex flex-1 flex-col items-center space-y-4">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveView(item.view)}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                activeView === item.view
                  ? "bg-indigo-50 text-primary-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                  : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 dark:hover:bg-zinc-800"
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
          <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            <Settings className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>

      {/* Campaign Sidebar */}
      <CampaignSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col relative">
        <main
          className={`flex-1 overflow-auto bg-[#F8FAFC] dark:bg-zinc-950 p-8 ${
            isSaving ? "pointer-events-none" : ""
          }`}
        >
          {/* 2. Conditionally render instead of navigating */}
          {activeView === "dayparting" ? <DaypartingPage /> : <ScheduledCampaignsPage />}
        </main>
      </div>

      {/* Floating Action Button (Save) */}
      {!isScheduledPage && (
        <div className="fixed bottom-8 right-8 z-50">
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
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const campaignsQuery: any = useCampaigns({
    type: "SPONSORED_PRODUCTS",
    limit: 15,
  });

  const initialCampaigns: Campaign[] =
    campaignsQuery.data?.map((campaign: any) => ({
      id: campaign.campaignId.toString(),
      name: campaign.name,
      status: campaign.state.toUpperCase() as Campaign["status"],
      adProduct: campaign.adProduct,
      marketplaces: campaign.marketplaces,
      creationDateTime: campaign.creationDateTime,
    })) || [];

  return (
    <DashboardProvider initialCampaigns={initialCampaigns}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}