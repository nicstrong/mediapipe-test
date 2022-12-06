import { Select } from '@mantine/core';
import { useEffect, useState } from 'react';

interface DeviceSelectorProps {
    predicate: (d: MediaDeviceInfo) => boolean
    selectedDeviceId: string | null
    onDeviceSelected: (d: MediaDeviceInfo) => void
    includeNone?: boolean
    label?: string
}

type DeviceItem = {
    value: string
    label: string
    data: MediaDeviceInfo
}
export function DeviceSelector({ label, predicate, selectedDeviceId, onDeviceSelected, includeNone }: DeviceSelectorProps) {
    const [devices, setDevices] = useState<DeviceItem[]>([])

    useEffect(() => {
        let complete = false
        async function getDevices() {
            const devices = await navigator?.mediaDevices.enumerateDevices()

            const items = devices?.filter(predicate)
                .map<DeviceItem>(d => ({
                    value: d.deviceId,
                    label: d.label,
                    data: d,
                }))
            if (!complete) {
                const noneDevice: MediaDeviceInfo = { deviceId: 'none', groupId: '', label: '', kind: 'audioinput', toJSON: () => { } }
                const none = { value: 'none', label: 'None', data: noneDevice, onClick: () => onDeviceSelected(noneDevice) }
                setDevices(includeNone ? [...items, none] : items)
            }
        }

        getDevices()
        return () => { complete = true }
    }, [includeNone, onDeviceSelected, predicate])

    useEffect(() => {
        if (selectedDeviceId === null && devices.length > 0) {
            const idx = devices.findIndex(d => d.value === 'default')
            onDeviceSelected(devices[idx !== -1 ? idx : 0].data as MediaDeviceInfo)
        }
    }, [devices, onDeviceSelected, selectedDeviceId])

    return <Select
        label={label}
        data={devices}
        value={selectedDeviceId}
        onChange={v => v && onDeviceSelected(devices.find(d => d.value === v)!.data)} />
}

