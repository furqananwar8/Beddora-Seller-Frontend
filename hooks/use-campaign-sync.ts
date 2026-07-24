"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useSyncCampaignSchedulesNowMutation } from "@/services/api/campaigns.api";
import type { SyncedCampaign } from "@/app/(dashboard)/dayparting/components/dashboard/scheduler/synced-campaigns-list";

export function useCampaignSync({ selectedCampaign }: { selectedCampaign?: any } = {}) {
  const [syncCampaignSchedulesNow] = useSyncCampaignSchedulesNowMutation();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCampaigns, setSyncedCampaigns] = useState<SyncedCampaign[]>([]);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncProgressItems, setSyncProgressItems] = useState<SyncedCampaign[]>([]);
  const [syncCompleted, setSyncCompleted] = useState(false);

  const handleSyncNow = useCallback(async () => {
    setSyncModalOpen(true);
    setSyncCompleted(false);
    setSyncProgressItems([]);
    setIsSyncing(true);

    try {
      const result = await syncCampaignSchedulesNow().unwrap();
      toast.success(result.message || "Campaign sync completed successfully.");
    } catch (error) {
      console.error("useCampaignSync - sync failed:", error);
      toast.error("Unable to sync campaign schedules.");
    } finally {
      setIsSyncing(false);
      setSyncCompleted(true);
    }
  }, [syncCampaignSchedulesNow]);

  // SSE disabled — manual fallback for now
  // TODO: Re-enable when backend SSE endpoint is stable
  // When re-enabled, wire setSyncProgressItems / setSyncedCampaigns to the event source

  return {
    isSyncing,
    syncedCampaigns,
    syncModalOpen,
    setSyncModalOpen,
    syncProgressItems,
    syncCompleted,
    handleSyncNow,
  };
}