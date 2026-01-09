'use client'

import { Card } from '@/components/ui/card'

export type AspectRatio = '1:1' | '16:9' | '9:16'

interface AspectRatioSelectorProps {
  selected: AspectRatio
  onSelect: (ratio: AspectRatio) => void
  disabled?: boolean
}

const ratioOptions: { value: AspectRatio; label: string; description: string; icon: string }[] = [
  { value: '1:1', label: 'Square', description: '小红书, Instagram', icon: '⬜' },
  { value: '16:9', label: 'Landscape', description: 'YouTube, Desktop', icon: '▭' },
  { value: '9:16', label: 'Vertical', description: 'TikTok, Stories', icon: '▯' },
]

export function AspectRatioSelector({ selected, onSelect, disabled }: AspectRatioSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Choose Aspect Ratio</label>
      <div className="grid grid-cols-3 gap-3">
        {ratioOptions.map((option) => (
          <Card
            key={option.value}
            className={`
              relative cursor-pointer transition-all duration-200
              hover:scale-105 hover:shadow-lg
              ${selected === option.value
                ? 'ring-2 ring-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950'
                : 'hover:bg-accent'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !disabled && onSelect(option.value)}
          >
            <div className="p-4 text-center space-y-2">
              <div className="text-4xl">{option.icon}</div>
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.value}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
            {selected === option.value && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
