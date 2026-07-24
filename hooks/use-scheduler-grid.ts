"use client";

import { useCallback, useMemo } from "react";
import { useDashboard } from "@/lib/context/dashboard-context";
import { useCampaignSync } from "./use-campaign-sync";
import { useScheduleGridState } from "./use-schedule-grid-state";
import { useScheduleSaveDraft } from "./use-schedule-save-draft";
import { SCHEDULER_DAYS, createEmptyWeekTemplate } from "@/app/(dashboard)/dayparting/components/dashboard/scheduler/scheduler-utils";
import { useClearCampaignWeeklyScheduleMutation } from "@/services/api/campaigns.api";

export function useSchedulerGrid() {
  const {
    selectedCampaign,
    campaignSchedules,
    setWeekTemplate,
    campaigns,
    setCampaigns,
    clearCampaignDraft,
  } = useDashboard();

  // RTK Query mutation — must be called at top level
  const [clearSchedule] = useClearCampaignWeeklyScheduleMutation();

  const campaignIdNum =
    selectedCampaign?.campaignId || Number(selectedCampaign?.id) || 0;

  const freshCampaign = useMemo(() => {
    if (!Array.isArray(campaigns) || !campaignIdNum) return null;
    return campaigns.find(
      (c) => c.campaignId === campaignIdNum || Number(c.id) === campaignIdNum
    );
  }, [campaigns, campaignIdNum]);

  const activeCampaign = freshCampaign;

  const sync = useCampaignSync({ selectedCampaign: activeCampaign });
  const grid = useScheduleGridState({
    selectedCampaign: activeCampaign,
    campaignSchedules,
    setWeekTemplate,
  });
  const saveDraft = useScheduleSaveDraft(
    campaignIdNum,
    campaignSchedules,
    selectedCampaign?.id,
  );

  const clearWeeklyTemplate = useCallback(async () => {
    if (!activeCampaign) return;

    // 1. Clear local draft
    setWeekTemplate(activeCampaign.id, "default", createEmptyWeekTemplate());

    // 2. Wipe backend
    const id = activeCampaign.campaignId || Number(activeCampaign.id);
    await clearSchedule(id).unwrap();

    // 3. UPDATE CONTEXT CAMPAIGNS ARRAY
    setCampaigns(
      campaigns.map((c) =>
        c.id === activeCampaign.id ? { ...c, schedules: [] } : c
      )
    );

    // 4. WIPE DRAFT ENTRY entirely
    clearCampaignDraft(activeCampaign.id);
  }, [activeCampaign, setWeekTemplate, clearSchedule, setCampaigns, campaigns, clearCampaignDraft]);

  return {
    selectedCampaign: activeCampaign,
    days: SCHEDULER_DAYS,

    isSyncing: sync.isSyncing,
    syncedCampaigns: sync.syncedCampaigns,
    syncModalOpen: sync.syncModalOpen,
    setSyncModalOpen: sync.setSyncModalOpen,
    syncProgressItems: sync.syncProgressItems,
    syncCompleted: sync.syncCompleted,
    handleSyncNow: sync.handleSyncNow,

    weekTemplate: grid.weekTemplate,
    clearWeeklyTemplate,
    toggleWeeklyCell: grid.toggleWeeklyCell,
    toggleFullDay: grid.toggleFullDay,

    setWeekTemplate,
    saveSchedules: saveDraft,
  };
}