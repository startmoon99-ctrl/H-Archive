import { DialogBody } from '@/components/Dialog'
import { DataSettings } from './DataSettings'
import { MotionSettings } from './MotionSettings'
import './settings.css'

export function SettingsPanel({ onClose }: { onClose: () => boolean }) {
  return (
    <DialogBody>
      <MotionSettings />
      <DataSettings onClose={onClose} />
    </DialogBody>
  )
}
