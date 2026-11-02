'use client'

import React, { useMemo } from 'react'

import {
  MultiSelectInput,
  type MultiSelectOption,
} from '@/components/multi-select-input/MultiSelectInput'

import type { ChannelConnection, ChannelId } from '../channelReport.types'
import { getChannel } from '../config/channels'
import { ChannelDots } from './ChannelBadges'

interface ChannelMultiSelectProps {
  /** Channels offered as options. */
  channels: ChannelId[]
  /** Adds each channel's sync status as a sub-line. */
  connections?: ChannelConnection[]
  value: string[]
  onChange: (value: string[]) => void
  /** Non-channel options appended after the channels (kept out of "All"). */
  extraOptions?: MultiSelectOption[]
  footer?: React.ReactNode
  /** Text before the dots on the trigger, e.g. "Channel:". */
  prefix?: string
  className?: string
  /** Channels that must stay selected; 0 lets the user clear them all. Defaults to 1. */
  minSelected?: number
}

const NO_EXTRA_OPTIONS: MultiSelectOption[] = []

/** The shared multi-select, configured with channel dots and sync lines. By default at least one option stays selected. */
export const ChannelMultiSelect: React.FC<ChannelMultiSelectProps> = ({
  channels,
  connections,
  value,
  onChange,
  extraOptions = NO_EXTRA_OPTIONS,
  footer,
  prefix,
  className,
  minSelected = 1,
}) => {
  const options = useMemo<MultiSelectOption[]>(
    () => [
      ...channels.map((channel) => {
        const connection = connections?.find((item) => item.channel === channel)
        return {
          id: channel,
          name: getChannel(channel).name,
          color: getChannel(channel).color,
          description: connection?.syncLabel,
          descriptionTone: connection?.syncTone === 'warning' ? ('warning' as const) : ('muted' as const),
        }
      }),
      ...extraOptions,
    ],
    [channels, connections, extraOptions],
  )

  const renderValue = (selected: MultiSelectOption[], allSelected: boolean) => {
    const selectedChannels = selected.map((option) => option.id).filter((id) => channels.includes(id))
    const text =
      selectedChannels.length === 1
        ? getChannel(selectedChannels[0]).name
        : allSelected && prefix
          ? 'All'
          : `${selectedChannels.length} channels`

    return (
      <span className="inline-flex items-center gap-2">
        {prefix && <span className="text-text-muted">{prefix}</span>}
        <ChannelDots channels={selectedChannels} />
        <span>{text}</span>
      </span>
    )
  }

  return (
    <MultiSelectInput
      title="Channel"
      allLabel="All channels"
      options={options}
      value={value}
      onChange={onChange}
      minSelected={minSelected}
      renderValue={renderValue}
      footer={footer}
      className={className}
      panelClassName="min-w-[240px]"
    />
  )
}
