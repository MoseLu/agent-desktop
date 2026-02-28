import React, { useState, useRef, useEffect } from 'react'
import Tooltip from './Tooltip'

export interface ModelOption {
  value: string
  label: string
  group: 'minimax' | 'qwen' | 'qwen-coding' | 'claude'
  description?: string
}

export interface ModelSelectorProps {
  value: string
  onChange: (model: string) => void
  options?: ModelOption[]
}

const DEFAULT_MODEL_OPTIONS: ModelOption[] = [
  // 百炼 Coding Plan
  { value: 'qwen3.5-plus', label: 'Qwen3.5 Plus', group: 'qwen-coding', description: '推荐' },
  { value: 'qwen3-coder-next', label: 'Qwen3 Coder Next', group: 'qwen-coding', description: '最新编程' },
  { value: 'qwen-turbo', label: 'Qwen Turbo', group: 'qwen-coding', description: '快速' },
  // MiniMax
  { value: 'MiniMax-M2.5', label: 'MiniMax M2.5', group: 'minimax', description: '推荐' },
  { value: 'MiniMax-Text-01', label: 'MiniMax Text-01', group: 'minimax' },
  // 通义千问 Qwen
  { value: 'qwen-plus', label: 'Qwen Plus', group: 'qwen' },
  { value: 'qwen-max', label: 'Qwen Max', group: 'qwen' },
  // Claude
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', group: 'claude' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', group: 'claude' },
]

const GROUP_LABELS: Record<string, string> = {
  'qwen-coding': '百炼 Coding Plan',
  'minimax': 'MiniMax',
  'qwen': '通义千问 Qwen',
  'claude': 'Claude',
}

const GROUP_COLORS: Record<string, string> = {
  'qwen-coding': '#6366f1',
  'minimax': '#f59e0b',
  'qwen': '#10b981',
  'claude': '#ec4899',
}

export default function ModelSelector({ value, onChange, options = DEFAULT_MODEL_OPTIONS }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'minimax' | 'qwen' | 'qwen-coding'>('all')
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 当前选中的模型
  const currentModel = options.find(m => m.value === value) || options[0]

  // 按组过滤模型
  const filteredOptions = selectedGroup === 'all' 
    ? options 
    : options.filter(m => m.group === selectedGroup)

  // 按组分组显示
  const groupedOptions = filteredOptions.reduce((acc, model) => {
    if (!acc[model.group]) {
      acc[model.group] = []
    }
    acc[model.group].push(model)
    return acc
  }, {} as Record<string, ModelOption[]>)

  const handleModelSelect = (modelValue: string) => {
    onChange(modelValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={styles.container}>
      {/* 触发器按钮 */}
      <button style={styles.triggerBtn} onClick={() => setIsOpen(p => !p)}>
        <span style={styles.modelLabel}>
          {currentModel?.label || value}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div style={styles.dropdownPanel}>
          {/* 组别筛选 */}
          <div style={styles.groupFilter}>
            {[
              { key: 'all', label: '全部' },
              { key: 'qwen-coding', label: '百炼 Coding Plan' },
              { key: 'minimax', label: 'MiniMax' },
              { key: 'qwen', label: 'Qwen' },
            ].map(({ key, label }) => (
              <button
                key={key}
                style={{
                  ...styles.groupFilterBtn,
                  ...(selectedGroup === key ? styles.groupFilterBtnActive : {}),
                }}
                onClick={() => setSelectedGroup(key as any)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 模型列表 */}
          <div style={styles.modelList}>
            {Object.entries(groupedOptions).map(([group, models]) => (
              <div key={group} style={styles.modelGroup}>
                <div style={styles.modelGroupHeader}>
                  <span style={styles.modelGroupLabel}>{GROUP_LABELS[group]}</span>
                  <span style={{ ...styles.modelGroupDot, background: GROUP_COLORS[group] }} />
                </div>
                {models.map(model => (
                  <button
                    key={model.value}
                    style={{
                      ...styles.modelItem,
                      ...(model.value === value ? styles.modelItemActive : {}),
                    }}
                    onClick={() => handleModelSelect(model.value)}
                  >
                    <div style={styles.modelItemLeft}>
                      <span style={styles.modelItemLabel}>{model.label}</span>
                      {model.description && (
                        <span style={styles.modelItemDesc}>{model.description}</span>
                      )}
                    </div>
                    {model.value === value && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M13.3332 4L5.99984 11.3333L2.6665 8"
                          stroke="#0094fc"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  triggerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid var(--border-medium)',
    background: 'var(--bg-secondary)',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-primary)',
    transition: 'all 0.15s',
  },
  modelLabel: {
    fontWeight: 500,
  },
  dropdownPanel: {
    position: 'absolute',
    right: 0,
    bottom: 'calc(100% + 8px)',
    width: 320,
    maxHeight: 420,
    background: 'var(--bg-primary)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-medium)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  groupFilter: {
    display: 'flex',
    gap: 4,
    padding: 8,
    borderBottom: '1px solid var(--border-light)',
  },
  groupFilterBtn: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontWeight: 500,
  },
  groupFilterBtnActive: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  },
  modelList: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
  },
  modelGroup: {
    marginBottom: 12,
  },
  modelGroupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    marginBottom: 4,
  },
  modelGroupLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    letterSpacing: '0.03em',
  },
  modelGroupDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  modelItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  modelItemActive: {
    background: 'rgba(0, 148, 252, 0.08)',
  },
  modelItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  modelItemLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  modelItemDesc: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    fontWeight: 500,
  },
}
