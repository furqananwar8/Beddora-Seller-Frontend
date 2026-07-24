"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import {
  BackendSchedule,
  buildSchedulesFromWeekTemplate,
} from "@/app/(dashboard)/dayparting/components/dashboard/scheduler/scheduler-utils";
import { useUpdateCampaignScheduleMutation } from "@/services/api/campaigns.api";
import { toast } from "sonner";

export type Campaign = {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "ARCHIVED";
  adProduct: "SPONSORED_PRODUCTS" | "SPONSORED_BRANDS" | "SPONSORED_DISPLAY";
  marketplaces?: string[];
  creationDate?: string;
  countryCode?: string;
  schedules?: BackendSchedule[];
  timezone: string;
  campaignId?: number;
};

export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type WeekTemplate = Record<DayKey, boolean[]>;
export type DateOverrides = Record<string, boolean[]>;

type WeeklyDraft = {
  weekTemplate: WeekTemplate;
  dateOverrides: DateOverrides;
  action: "ENABLED" | "PAUSED";
};

type CampaignSchedules = {
  weeks: Record<string, WeeklyDraft>;
};

type DashboardContextType = {
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;
  selectedCampaign: Campaign | null;
  setSelectedCampaign: (campaign: Campaign | null) => void;
  campaignSchedules: Record<string, CampaignSchedules>;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  clearSelectedCampaign: () => void;
  setWeekTemplate: (
    campaignId: string,
    weekStart: string,
    weekTemplate: WeekTemplate,
  ) => void;
  setDateOverride: (
    campaignId: string,
    weekStart: string,
    date: string,
    schedule: boolean[],
  ) => void;
  setWeekAction: (
    campaignId: string,
    weekStart: string,
    action: "ENABLED" | "PAUSED",
  ) => void;
  deleteDateOverride: (
    campaignId: string,
    weekStart: string,
    date: string,
  ) => void;
  handleSave: () => void;
  clearCampaignDraft: (campaignId: string) => void;
};

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

const days: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const createEmptyWeekTemplate = (): WeekTemplate => {
  const template = {} as WeekTemplate;
  days.forEach((day) => {
    template[day] = Array(24).fill(false);
  });
  return template;
};

const createEmptyCampaignSchedule = (): CampaignSchedules => ({
  weeks: {},
});

const createEmptyWeeklyDraft = (): WeeklyDraft => ({
  weekTemplate: createEmptyWeekTemplate(),
  dateOverrides: {},
  action: "ENABLED",
});

export function DashboardProvider({
  children,
  initialCampaigns,
}: {
  children: ReactNode;
  initialCampaigns: Campaign[];
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [isSaving, setIsSaving] = useState(false);
  const [campaignSchedules, setCampaignSchedules] = useState<
    Record<string, CampaignSchedules>
  >({});
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const [updateSchedule] = useUpdateCampaignScheduleMutation();

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId || !campaigns) return null;
    return campaigns.find(
      (c: any) => c.campaignId === selectedCampaignId || String(c.id) === selectedCampaignId
    ) || null;
  }, [selectedCampaignId, campaigns]);

  const setSelectedCampaign = useCallback((campaign: Campaign | null) => {
    setSelectedCampaignId(campaign?.id || null);
  }, []);

  const clearSelectedCampaign = useCallback(() => {
    setSelectedCampaign(null);
  }, [setSelectedCampaign]);

  const updateLocalCampaignSchedule = (
    campaignId: string,
    weekStart: string,
    updater: (draft: WeeklyDraft) => WeeklyDraft,
  ) => {
    setCampaignSchedules((prev) => {
      const current = prev[campaignId] || createEmptyCampaignSchedule();
      const currentWeekDraft =
        current.weeks[weekStart] || createEmptyWeeklyDraft();

      return {
        ...prev,
        [campaignId]: {
          ...current,
          weeks: {
            ...current.weeks,
            [weekStart]: updater(currentWeekDraft),
          },
        },
      };
    });
  };

  const setWeekTemplate = (
    campaignId: string,
    weekStart: string,
    weekTemplate: WeekTemplate,
  ) => {
    updateLocalCampaignSchedule(campaignId, weekStart, (draft) => ({
      ...draft,
      weekTemplate,
    }));
  };

  const setDateOverride = (
    campaignId: string,
    weekStart: string,
    date: string,
    schedule: boolean[],
  ) => {
    updateLocalCampaignSchedule(campaignId, weekStart, (draft) => ({
      ...draft,
      dateOverrides: {
        ...draft.dateOverrides,
        [date]: schedule,
      },
    }));
  };

  const setWeekAction = (
    campaignId: string,
    weekStart: string,
    action: "ENABLED" | "PAUSED",
  ) => {
    updateLocalCampaignSchedule(campaignId, weekStart, (draft) => ({
      ...draft,
      action,
    }));
  };

  const deleteDateOverride = (
    campaignId: string,
    weekStart: string,
    date: string,
  ) => {
    updateLocalCampaignSchedule(campaignId, weekStart, (draft) => {
      const overrides = { ...draft.dateOverrides };
      delete overrides[date];
      return {
        ...draft,
        dateOverrides: overrides,
      };
    });
  };

  const handleSave = async () => {
    const campaignEntries = Object.entries(campaignSchedules);

    if (campaignEntries.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);

    try {
      const savePromises = campaignEntries.map(async ([campaignId, campaignSchedule]) => {
        const campaign = campaigns.find((c) => c.id === campaignId);
        if (!campaign) return null;

        const campaignName = campaign.name;
        const campaignIdNum = Number(campaignId);
        const weeks = (campaignSchedule as any).weeks ?? {};
        const weekEntries = Object.entries(weeks);

        if (weekEntries.length === 0) {
          await updateSchedule({
            campaignId: campaignIdNum,
            payload: { schedules: [], campaignName },
          }).unwrap();

          setCampaigns((prev) =>
            prev.map((c) =>
              String(c.id) === campaignId ? { ...c, schedules: [] } : c
            )
          );

          return { campaignId, campaignName, cleared: true };
        }

        const [, latestDraft] = weekEntries[weekEntries.length - 1] as [string, any];
        const schedules = buildSchedulesFromWeekTemplate(
          latestDraft.weekTemplate ?? createEmptyWeekTemplate(),
          latestDraft.action ?? "ENABLED",
        );

        await updateSchedule({
          campaignId: campaignIdNum,
          payload: { schedules, campaignName },
        }).unwrap();

        setCampaigns((prev) =>
          prev.map((c) =>
            String(c.id) === campaignId || String(c.campaignId) === campaignId
              ? { ...c, schedules }
              : c
          )
        );

        setCampaignSchedules((prev) => {
          const next = { ...prev };
          delete next[campaignId];
          return next;
        });

        return { campaignId, campaignName, cleared: schedules.length === 0 };
      });

      const results = await Promise.all(savePromises);
      results.forEach((result) => {
        if (!result) return;
        if (result.cleared) {
          toast.success(`Cleared schedule for ${result.campaignName}!`);
        } else {
          toast.success(`Saved schedule for ${result.campaignName}!`);
        }
      });
    } catch (error) {
      toast.error("Failed to save one or more campaign schedules.");
    } finally {
      setIsSaving(false);
    }
  };

  const clearCampaignDraft = useCallback((campaignId: string) => {
    setCampaignSchedules((prev) => {
      const next = { ...prev };
      delete next[campaignId];
      return next;
    });
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        campaigns,
        setCampaigns,
        selectedCampaign,
        setSelectedCampaign,
        campaignSchedules,
        setWeekTemplate,
        setDateOverride,
        setWeekAction,
        deleteDateOverride,
        handleSave,
        isSaving,
        setIsSaving,
        clearSelectedCampaign,
        clearCampaignDraft,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}