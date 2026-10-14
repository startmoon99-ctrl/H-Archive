import { DialogBody } from '@/components/Dialog'
import { DataSettings } from './DataSettings'
import { MotionSettings } from './MotionSettings'
import { SoundSettings } from './SoundSettings'
import { SpaceSettings } from './SpaceSettings'
import './settings.css'

export function SettingsPanel({ onClose }: { onClose: () => boolean }) {
  return (
    <DialogBody>
      <MotionSettings />
      <SpaceSettings onClose={onClose} />
      <SoundSettings />
      <DataSettings onClose={onClose} />
    </DialogBody>
  )
}
