import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { ModelOption } from '@types'

export type { ModelOption }

export interface ModelSelectorProps {
  value: string
  onChange: (model: string) => void
  options?: ModelOption[]
}

const DEFAULT_MODEL_OPTIONS: ModelOption[] = [
  // 百炼 Coding Plan
  { value: 'qwen3.5-plus',        label: 'Qwen3.5 Plus',     group: 'qwen-coding', description: '推荐' },
  { value: 'qwen3-coder-next',     label: 'Qwen3 Coder Next', group: 'qwen-coding', description: '最新编程' },
  { value: 'qwen3-coder-plus',     label: 'Qwen3 Coder Plus', group: 'qwen-coding' },
  { value: 'qwen3-max-2026-01-23', label: 'Qwen3 Max',        group: 'qwen-coding' },
  // MiniMax
  { value: 'MiniMax-M2.5',    label: 'MiniMax M2.5',    group: 'minimax', description: '推荐' },
  { value: 'MiniMax-Text-01', label: 'MiniMax Text-01', group: 'minimax' },
  // 通义千问 Qwen
  { value: 'qwen-plus', label: 'Qwen Plus', group: 'qwen' },
  { value: 'qwen-max',  label: 'Qwen Max',  group: 'qwen' },
  // GLM
  { value: 'glm-5',   label: 'GLM-5',   group: 'glm' },
  { value: 'glm-4.7', label: 'GLM-4.7', group: 'glm' },
  // Kimi
  { value: 'kimi-k2.5', label: 'Kimi K2.5', group: 'kimi' },
  // Claude
  { value: 'claude-sonnet-4-20250514',  label: 'Claude Sonnet 4',  group: 'claude' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', group: 'claude' },
]

const GROUP_LABELS: Record<string, string> = {
  'qwen-coding': '百炼 Coding Plan',
  'minimax': 'MiniMax',
  'qwen': '通义千问 Qwen',
  'claude': 'Claude',
  'glm': '智谱 GLM',
  'kimi': 'Kimi',
}

const GROUP_COLORS: Record<string, string> = {
  'qwen-coding': '#6366f1',
  'minimax': '#f59e0b',
  'qwen': '#10b981',
  'claude': '#ec4899',
  'glm': '#6d28d9',
  'kimi': '#0ea5e9',
}

const PANEL_WIDTH = 320
const PANEL_MAX_HEIGHT = 440
const GAP = 8

export default function ModelSelector({ value, onChange, options = DEFAULT_MODEL_OPTIONS }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)

  // 计算面板的 fixed 位置（在触发按钮上方或下方）
  const updatePanelPosition = useCallback(() => {
    const btn = triggerRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom

    // 优先在上方展开，空间不够时在下方展开
    const openAbove = spaceAbove >= Math.min(PANEL_MAX_HEIGHT, 200) || spaceAbove >= spaceBelow
    const maxH = openAbove
      ? Math.min(PANEL_MAX_HEIGHT, spaceAbove - GAP)
      : Math.min(PANEL_MAX_HEIGHT, spaceBelow - GAP)

    const right = window.innerWidth - rect.right
    const clampedRight = Math.max(GAP, Math.min(right, window.innerWidth - PANEL_WIDTH - GAP))

    setPanelStyle({
      position: 'fixed',
      right: clampedRight,
      width: PANEL_WIDTH,
      maxHeight: maxH,
      zIndex: 9999,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePanelPosition()

    const close = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest?.('[data-model-panel]')
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [isOpen, updatePanelPosition])

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

  const panel = isOpen ? createPortal(
    <div data-model-panel style={{ ...styles.dropdownPanel, ...panelStyle }}>
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
    </div>,
    document.body,
  ) : null

  return (
    <div style={styles.container}>
      {/* 触发器按钮 */}
      <button ref={triggerRef} style={styles.triggerBtn} onClick={() => setIsOpen(p => !p)}>
        <span style={styles.modelLabel}>
          {currentModel?.label || value}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {panel}
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
    background: 'var(--bg-primary)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-medium)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  groupFilter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
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
