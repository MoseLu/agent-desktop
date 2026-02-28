import React, { useState, useRef, useEffect } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────
const HOURS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['早上', '晚上']
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
// 循环间隔选项（移除 24 小时，避免与"每天"重复）
const INTERVAL_HOURS = ['1', '2', '3', '4', '6', '8', '12']
const INTERVAL_MINUTES = ['5', '10', '15', '20', '30', '45', '60']

const ITEM_H = 40
const VISIBLE = 7
const CENTER = Math.floor(VISIBLE / 2) // = 3

// ─── DrumPicker ───────────────────────────────────────────────────────────────
interface DrumPickerProps {
  items: string[]
  initialIdx: number
  onChange: (i: number) => void
}

function DrumPicker({ items, initialIdx, onChange }: DrumPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [currentIdx, setCurrentIdx] = useState(initialIdx)

  useEffect(() => {
    if (ref.current) {
      // 使用 requestAnimationFrame 确保在下一帧滚动，避免阻塞渲染
      requestAnimationFrame(() => {
        ref.current!.scrollTop = initialIdx * ITEM_H
      })
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snap = () => {
    if (!ref.current) return
    const raw = ref.current.scrollTop / ITEM_H
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(raw)))
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
    onChange(idx)
    setCurrentIdx(idx)
  }

  const handleScroll = () => {
    if (!ref.current) return
    clearTimeout(timer.current)
    // 在滚动过程中也实时更新选中索引（视觉反馈）
    const raw = ref.current.scrollTop / ITEM_H
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(raw)))
    setCurrentIdx(idx)
    // 滚动停止后回弹
    timer.current = setTimeout(snap, 120)
  }

  const handleClick = (i: number) => {
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
    onChange(i)
    setCurrentIdx(i)
  }

  const pad = CENTER * ITEM_H

  return (
    <div style={{ position: 'relative', flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      {/* Center highlight band - 选中项高亮背景（使用更明显的颜色） */}
      <div style={{
        position: 'absolute',
        top: CENTER * ITEM_H,
        left: 8, right: 8,
        height: ITEM_H,
        // 深色主题下使用更浅的背景，浅色主题下使用较深的背景
        background: 'var(--selected-bg)',
        borderRadius: 6,
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      {/* Top fade - 顶部渐变遮罩 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: CENTER * ITEM_H,
        background: 'linear-gradient(to bottom, var(--bg-primary) 20%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Bottom fade - 底部渐变遮罩 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: CENTER * ITEM_H,
        background: 'linear-gradient(to top, var(--bg-primary) 20%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      <div
        ref={ref}
        onScroll={handleScroll}
        className="drum-scroll"
        style={{ 
          height: '100%', 
          overflowY: 'auto',
        }}
      >
        <div style={{ paddingTop: pad, paddingBottom: pad }}>
          {items.map((item, i) => {
            const isSelected = i === currentIdx
            return (
              <div
                key={i}
                onClick={() => handleClick(i)}
                style={{
                  height: ITEM_H,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, cursor: 'pointer',
                  // 所有项都使用白色文本（深色主题下可见）
                  color: 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  position: 'relative', zIndex: 3, userSelect: 'none',
                  transition: 'all 0.15s',
                  // 选中项添加额外的视觉反馈
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  opacity: isSelected ? 1 : 0.5,
                }}
              >
                {item}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskData {
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'interval'
  weekday?: number
  scheduledTime?: string
  intervalValue?: number
  intervalUnit?: 'hour' | 'minute'
}

interface Props {
  onClose: () => void
  onConfirm: (data: TaskData) => void
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function NewScheduledTaskModal({ onClose, onConfirm }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'interval'>('daily')
  const [weekday, setWeekday] = useState(0)

  // Time picker state
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [hourIdx, setHourIdx] = useState(0)
  const [minuteIdx, setMinuteIdx] = useState(0)
  const [periodIdx, setPeriodIdx] = useState(0)
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 0 })

  // Interval picker state
  const [intervalUnit, setIntervalUnit] = useState<'hour' | 'minute'>('hour')
  const [intervalValueIdx, setIntervalValueIdx] = useState(0)
  const [confirmedInterval, setConfirmedInterval] = useState<string | null>(null)
  const [intervalPickerKey, setIntervalPickerKey] = useState(0)

  const triggerRef = useRef<HTMLButtonElement>(null)

  const openTimePicker = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPickerPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
    }
    setTimePickerOpen(true)
  }

  const handleSetNow = () => {
    const now = new Date()
    const h = now.getHours() % 12 // 0–11 (0 = 12 o'clock)
    const m = now.getMinutes()
    const pm = now.getHours() >= 12
    setHourIdx(h)
    setMinuteIdx(m)
    setPeriodIdx(pm ? 1 : 0)
    setPickerKey(k => k + 1) // remount drum pickers to reset scroll
  }

  const confirmTime = () => {
    const h = HOURS[hourIdx]
    const m = MINUTES[minuteIdx]
    const p = PERIODS[periodIdx]
    setConfirmedTime(`${h}:${m} ${p}`)
    setTimePickerOpen(false)
  }

  // Interval picker handlers
  const openIntervalPicker = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPickerPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 320) })
    }
    setTimePickerOpen(true)
  }

  const confirmInterval = () => {
    const items = intervalUnit === 'hour' ? INTERVAL_HOURS : INTERVAL_MINUTES
    const value = items[intervalValueIdx]
    const unitText = intervalUnit === 'hour' ? '小时' : '分钟'
    setConfirmedInterval(`每 ${value} ${unitText}`)
    setTimePickerOpen(false)
  }

  const handleConfirm = () => {
    if (!name.trim() || (!confirmedTime && !confirmedInterval)) return
    onConfirm({
      name: name.trim(),
      description: description.trim(),
      frequency,
      weekday: frequency === 'weekly' ? weekday : undefined,
      scheduledTime: frequency === 'interval' ? undefined : confirmedTime ?? undefined,
      intervalValue: frequency === 'interval' ? Number((intervalUnit === 'hour' ? INTERVAL_HOURS : INTERVAL_MINUTES)[intervalValueIdx]) : undefined,
      intervalUnit: frequency === 'interval' ? intervalUnit : undefined,
    })
    onClose()
  }

  return (
    <>
      {/* Modal overlay */}
      <div
        style={s.overlay}
        onClick={e => {
          if (e.target === e.currentTarget) {
            if (timePickerOpen) setTimePickerOpen(false)
            else onClose()
          }
        }}
      >
        <div style={s.modal}>
          {/* Header */}
          <div style={s.header}>
            <span style={s.title}>新建定时任务</span>
            <button style={s.closeBtn} onClick={onClose}>×</button>
          </div>

          {/* Body */}
          <div style={s.body}>
            {/* 名称 */}
            <div style={s.field}>
              <label style={s.label}>名称 <span style={s.required}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={50}
                  style={s.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="请输入任务名称"
                />
                <span style={s.counter}>{name.length} / 50</span>
              </div>
            </div>

            {/* 说明 */}
            <div style={s.field}>
              <label style={s.label}>说明 <span style={s.required}>*</span></label>
              <div style={{ position: 'relative' }}>
                <textarea
                  maxLength={8000}
                  style={s.textarea}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="请输入任务说明"
                />
                <span style={{ ...s.counter, top: 'auto', bottom: 10, transform: 'none' }}>
                  {description.length} / 8000
                </span>
              </div>
            </div>

            {/* 计划时间 */}
            <div style={s.field}>
              <label style={s.label}>计划时间 <span style={s.required}>*</span></label>
              <div style={s.timeRow}>
                {/* Frequency */}
                <div style={{ position: 'relative', flex: 1 }}>
                  <select
                    style={s.select}
                    value={frequency}
                    onChange={e => {
                      setFrequency(e.target.value as 'daily' | 'weekly' | 'interval')
                      // 切换频率类型时清空之前的选择
                      if (e.target.value !== 'interval') {
                        setConfirmedInterval(null)
                      } else {
                        setConfirmedTime(null)
                      }
                    }}
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="interval">循环</option>
                  </select>
                  <ChevronDown style={s.selectArrow} />
                </div>

                {/* Weekday (weekly only) */}
                {frequency === 'weekly' && (
                  <div style={{ position: 'relative', flex: 1 }}>
                    <select
                      style={s.select}
                      value={weekday}
                      onChange={e => setWeekday(Number(e.target.value))}
                    >
                      {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                    <ChevronDown style={s.selectArrow} />
                  </div>
                )}

                {/* Time trigger or Interval trigger */}
                <button
                  ref={triggerRef}
                  style={{ ...s.select, ...s.timeTrigger, flex: frequency === 'weekly' ? 1 : 1.6 }}
                  onClick={frequency === 'interval' ? openIntervalPicker : openTimePicker}
                >
                  <span style={{ color: (confirmedTime || confirmedInterval) ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {frequency === 'interval' 
                      ? (confirmedInterval ?? '请选择循环间隔')
                      : (confirmedTime ?? '请选择时间')
                    }
                  </span>
                  <ChevronDown style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={s.footer}>
            <button style={s.cancelBtn} onClick={onClose}>取消</button>
            <button
              style={{ ...s.confirmBtn, opacity: !name.trim() || !confirmedTime ? 0.5 : 1 }}
              onClick={handleConfirm}
              disabled={!name.trim() || !confirmedTime}
            >
              确认
            </button>
          </div>
        </div>
      </div>

      {/* Time picker panel — fixed positioned, above modal overlay */}
      {timePickerOpen && (
        <>
          {/* Backdrop for picker */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 2100 }}
            onClick={() => setTimePickerOpen(false)}
          />
          {/* 全局滚动条样式 */}
          <style>{`
            .drum-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .drum-scroll::-webkit-scrollbar-track {
              background: transparent;
              margin: 8px 0;
            }
            .drum-scroll::-webkit-scrollbar-thumb {
              background: var(--border-medium);
              border-radius: 3px;
              transition: background 0.2s;
            }
            .drum-scroll::-webkit-scrollbar-thumb:hover {
              background: var(--text-tertiary);
            }
            .drum-scroll {
              scrollbar-width: thin;
              scrollbar-color: var(--border-medium) transparent;
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: pickerPos.top,
            left: pickerPos.left,
            width: pickerPos.width,
            zIndex: 2101,
            background: 'var(--bg-primary)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden',
          }}>
            {frequency === 'interval' ? (
              // Interval picker UI
              <>
                {/* Unit selector tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
                  <button
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: intervalUnit === 'hour' ? 'var(--bg-tertiary)' : 'transparent',
                      border: 'none',
                      borderBottom: intervalUnit === 'hour' ? '2px solid var(--text-primary)' : '2px solid transparent',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontWeight: intervalUnit === 'hour' ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      setIntervalUnit('hour')
                      setIntervalValueIdx(0)
                      setIntervalPickerKey(k => k + 1)
                    }}
                  >
                    小时
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: intervalUnit === 'minute' ? 'var(--bg-tertiary)' : 'transparent',
                      border: 'none',
                      borderBottom: intervalUnit === 'minute' ? '2px solid var(--text-primary)' : '2px solid transparent',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontWeight: intervalUnit === 'minute' ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => {
                      setIntervalUnit('minute')
                      setIntervalValueIdx(0)
                      setIntervalPickerKey(k => k + 1)
                    }}
                  >
                    分钟
                  </button>
                </div>
                {/* Interval value picker */}
                <div style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <DrumPicker
                    key={`interval-${intervalUnit}-${intervalPickerKey}`}
                    items={intervalUnit === 'hour' ? INTERVAL_HOURS : INTERVAL_MINUTES}
                    initialIdx={intervalValueIdx}
                    onChange={setIntervalValueIdx}
                  />
                </div>
                {/* Bottom actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 16px' }}>
                  <button style={s.okBtn} onClick={confirmInterval}>确 定</button>
                </div>
              </>
            ) : (
              // Time picker UI (existing)
              <>
                {/* Columns */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
                  <DrumPicker key={`h-${pickerKey}`} items={HOURS} initialIdx={hourIdx} onChange={setHourIdx} />
                  <div style={{ width: 1, background: 'var(--border-light)', flexShrink: 0 }} />
                  <DrumPicker key={`m-${pickerKey}`} items={MINUTES} initialIdx={minuteIdx} onChange={setMinuteIdx} />
                  <div style={{ width: 1, background: 'var(--border-light)', flexShrink: 0 }} />
                  <DrumPicker key={`p-${pickerKey}`} items={PERIODS} initialIdx={periodIdx} onChange={setPeriodIdx} />
                </div>
                {/* Bottom actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px' }}>
                  <button style={s.nowBtn} onClick={handleSetNow}>此刻</button>
                  <button style={s.okBtn} onClick={confirmTime}>确 定</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

// ─── Small helper icon ────────────────────────────────────────────────────────
function ChevronDown({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={style}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'var(--bg-overlay)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    width: 560,
    background: 'var(--bg-primary)',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    display: 'flex', flexDirection: 'column',
    overflow: 'visible',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid var(--border-light)',
  },
  title: { fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 24,
    color: 'var(--text-tertiary)', cursor: 'pointer', lineHeight: 1,
  },
  body: { padding: '20px 24px 4px' },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 },
  required: { color: '#e53e3e' },
  input: {
    width: '100%', height: 44,
    border: '1px solid var(--border-medium)', borderRadius: 8,
    padding: '0 68px 0 12px', fontSize: 14,
    color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
    background: 'var(--bg-primary)',
  },
  textarea: {
    width: '100%', height: 160,
    border: '1px solid var(--border-medium)', borderRadius: 8,
    padding: '12px 12px 28px', fontSize: 14,
    color: 'var(--text-primary)', outline: 'none',
    resize: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', background: 'var(--bg-primary)',
  },
  counter: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-tertiary)',
    pointerEvents: 'none',
  },
  timeRow: { display: 'flex', gap: 8, alignItems: 'center' },
  select: {
    display: 'block', width: '100%', height: 44,
    border: '1px solid var(--border-medium)', borderRadius: 8,
    padding: '0 36px 0 12px', fontSize: 14,
    color: 'var(--text-primary)', outline: 'none',
    background: 'var(--bg-primary)', fontFamily: 'inherit',
    cursor: 'pointer', boxSizing: 'border-box',
    appearance: 'none' as const,
  },
  selectArrow: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)', pointerEvents: 'none',
    color: 'var(--text-tertiary)',
  },
  timeTrigger: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingRight: 12, cursor: 'pointer',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '16px 24px 20px',
    borderTop: '1px solid var(--border-light)',
  },
  cancelBtn: {
    border: '1px solid var(--border-medium)', background: 'var(--bg-primary)',
    borderRadius: 8, padding: '8px 24px', fontSize: 14,
    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
  },
  confirmBtn: {
    border: 'none', background: 'var(--text-primary)',
    borderRadius: 8, padding: '8px 24px', fontSize: 14,
    color: 'var(--bg-primary)', fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  nowBtn: {
    background: 'none', border: 'none', fontSize: 13,
    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
  },
  okBtn: {
    background: 'var(--text-primary)', border: 'none', borderRadius: 8,
    padding: '6px 20px', fontSize: 13, color: 'var(--bg-primary)',
    cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit',
  },
}
