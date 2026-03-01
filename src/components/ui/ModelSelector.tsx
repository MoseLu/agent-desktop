import React, { useState, useRef, useEffect } from 'react'
import type { ModelOption } from '@types'

export type { ModelOption }

export interface ModelSelectorProps {
  value: string
  onChange: (model: string) => void
  options?: ModelOption[]
}

const DEFAULT_MODEL_OPTIONS: ModelOption[] = [
  // 推荐模型
  { value: 'qwen3.5-plus',        label: 'Qwen3.5 Plus',     group: 'qwen-coding', description: '推荐，支持图片理解' },
  { value: 'kimi-k2.5',           label: 'Kimi K2.5',         group: 'kimi',        description: '支持图片理解' },
  { value: 'glm-5',               label: 'GLM-5',              group: 'glm' },
  { value: 'MiniMax-M2.5',        label: 'MiniMax M2.5',      group: 'minimax',    description: '推荐' },
  // 更多模型
  { value: 'qwen3-max-2026-01-23', label: 'Qwen3 Max',        group: 'qwen-coding' },
  { value: 'qwen3-coder-next',     label: 'Qwen3 Coder Next', group: 'qwen-coding' },
  { value: 'qwen3-coder-plus',     label: 'Qwen3 Coder Plus', group: 'qwen-coding' },
  { value: 'glm-4.7',              label: 'GLM-4.7',            group: 'glm' },
]

const GROUP_LABELS: Record<string, string> = {
  'qwen-coding': '百炼 Coding Plan',
  'minimax': 'MiniMax',
  'kimi': 'Kimi',
  'glm': '智谱 GLM',
}

const GROUP_COLORS: Record<string, string> = {
  'qwen-coding': '#6366f1',
  'minimax': '#f59e0b',
  'kimi': '#0ea5e9',
  'glm': '#6d28d9',
}

export default function ModelSelector({ value, onChange, options = DEFAULT_MODEL_OPTIONS }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
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

  // 动态计算存在的组别，用于筛选标签
  const availableGroups = Array.from(new Set(options.map(m => m.group)))
  const filterTabs = [
    { key: 'all', label: '全部' },
    ...availableGroups.map(g => ({ key: g, label: GROUP_LABELS[g] ?? g })),
  ]

  // 如果当前选中的 group 在新 options 中不存在，重置到 all
  useEffect(() => {
    if (selectedGroup !== 'all' && !availableGroups.includes(selectedGroup as ModelOption['group'])) {
      setSelectedGroup('all')
    }
  }, [options]) // eslint-disable-line react-hooks/exhaustive-deps

  // 按组过滤模型
  const filteredOptions = selectedGroup === 'all'
    ? options
    : options.filter(m => m.group === selectedGroup)

  // 按组分组显示
  const groupedOptions = filteredOptions.reduce((acc, model) => {
    if (!acc[model.group]) acc[model.group] = []
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
          {/* 组别筛选（仅当有多于一组时显示） */}
          {filterTabs.length > 2 && (
            <div style={styles.groupFilter}>
              {filterTabs.map(({ key, label }) => (
                <button
                  key={key}
                  style={{
                    ...styles.groupFilterBtn,
                    ...(selectedGroup === key ? styles.groupFilterBtnActive : {}),
                  }}
                  onClick={() => setSelectedGroup(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 模型列表 */}
          <div style={styles.modelList}>
            {Object.entries(groupedOptions).map(([group, models]) => (
              <div key={group} style={styles.modelGroup}>
                <div style={styles.modelGroupHeader}>
                  <span style={styles.modelGroupLabel}>{GROUP_LABELS[group] ?? group}</span>
                  <span style={{ ...styles.modelGroupDot, background: GROUP_COLORS[group] ?? '#888' }} />
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
    maxHeight: 440,
    background: 'var(--bg-primary)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-medium)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 2050,
  },
  groupFilter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
    borderBottom: '1px solid var(--border-light)',
  },
  groupFilterBtn: {
    padding: '5px 8px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    fontSize: 11,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontWeight: 500,
    whiteSpace: 'nowrap',
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
