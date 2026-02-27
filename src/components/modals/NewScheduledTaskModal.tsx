import React, { useState, useRef, useEffect } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────
const HOURS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
const PERIODS = ['早上', '晚上']
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

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
  const isUserScrolling = useRef(false)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = initialIdx * ITEM_H
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
    isUserScrolling.current = false
  }

  const handleScroll = () => {
    isUserScrolling.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(snap, 160)
  }

  const handleClick = (i: number) => {
    ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
    onChange(i)
  }

  const pad = CENTER * ITEM_H

  return (
    <div style={{ position: 'relative', flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      {/* Center highlight band */}
      <div style={{
        position: 'absolute',
        top: CENTER * ITEM_H,
        left: 4, right: 4,
        height: ITEM_H,
        background: 'var(--bg-tertiary)',
        borderRadius: 6,
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: CENTER * ITEM_H,
        background: 'linear-gradient(to bottom, var(--bg-primary) 30%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: CENTER * ITEM_H,
        background: 'linear-gradient(to top, var(--bg-primary) 30%, transparent 100%)',
        pointerEvents: 'none', zIndex: 2,
      }} />

      <div
        ref={ref}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'scroll', scrollbarWidth: 'none' }}
      >
        <div style={{ paddingTop: pad, paddingBottom: pad }}>
          {items.map((item, i) => (
            <div
              key={i}
              onClick={() => handleClick(i)}
              style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, cursor: 'pointer',
                color: 'var(--text-primary)',
                position: 'relative', zIndex: 3, userSelect: 'none',
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskData {
  name: string
  description: string
  frequency: string
  weekday?: number
  scheduledTime: string
}

interface Props {
  onClose: () => void
  onConfirm: (data: TaskData) => void
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function NewScheduledTaskModal({ onClose, onConfirm }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [weekday, setWeekday] = useState(0)

  // Time picker state
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [hourIdx, setHourIdx] = useState(0)
  const [minuteIdx, setMinuteIdx] = useState(0)
  const [periodIdx, setPeriodIdx] = useState(0)
  const [confirmedTime, setConfirmedTime] = useState<string | null>(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 0 })

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

  const handleConfirm = () => {
    if (!name.trim() || !confirmedTime) return
    onConfirm({
      name: name.trim(),
      description: description.trim(),
      frequency,
      weekday: frequency === 'weekly' ? weekday : undefined,
      scheduledTime: confirmedTime,
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
                    onChange={e => setFrequency(e.target.value)}
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
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

                {/* Time trigger */}
                <button
                  ref={triggerRef}
                  style={{ ...s.select, ...s.timeTrigger, flex: frequency === 'weekly' ? 1 : 1.6 }}
                  onClick={openTimePicker}
                >
                  <span style={{ color: confirmedTime ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {confirmedTime ?? '请选择时间'}
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
