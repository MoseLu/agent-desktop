import React, { useState, useEffect, useCallback } from 'react'
import type { Message, ToolEvent } from '@types'
import {
  CloseOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { isElectron } from '@utils/env'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'process' | 'files'

export interface PreviewPanelProps {
  messages: Message[]
  workspace: string
  onClose: () => void
}

interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
  expanded?: boolean
  loading?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  execute_shell: '命令行执行',
  read_file: '读取文件',
  write_file: '写入文件',
  list_files: '列出文件',
  search_files: '搜索文件',
  create_directory: '创建目录',
  move_file: '移动文件',
  delete_file: '删除文件',
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function getToolBrief(input: Record<string, unknown>): string {
  const val = input.command ?? input.path ?? input.source ?? input.query ?? Object.values(input)[0]
  return String(val ?? '').slice(0, 80)
}

function getResultOutput(result: Record<string, unknown> | undefined): string | null {
  if (!result) return null
  const raw = result.output ?? result.content ?? result.files ?? result.message
  if (raw == null) return JSON.stringify(result, null, 2)
  return String(raw)
}

function updateNode(nodes: FileNode[], targetPath: string, update: Partial<FileNode>): FileNode[] {
  return nodes.map(node => {
    if (node.path === targetPath) return { ...node, ...update }
    if (node.children) return { ...node, children: updateNode(node.children, targetPath, update) }
    return node
  })
}

function filterNodes(nodes: FileNode[], query: string): FileNode[] {
  const result: FileNode[] = []
  for (const node of nodes) {
    if (node.name.toLowerCase().includes(query)) {
      result.push(node)
    } else if (node.isDir && node.children) {
      const filtered = filterNodes(node.children, query)
      if (filtered.length) result.push({ ...node, expanded: true, children: filtered })
    }
  }
  return result
}

async function loadDir(path: string): Promise<FileNode[]> {
  if (!isElectron()) return []
  const items = await window.electron.fsList(path)
  return items
    .map(item => ({ name: item.name, path: item.path, isDir: item.isDir }))
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

// ─── Process view ─────────────────────────────────────────────────────────────

function ProcessView({ messages }: { messages: Message[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Collect unique tool events (prefer tool_result over tool_start)
  const eventsMap = new Map<string, ToolEvent>()
  for (const msg of messages) {
    for (const ev of msg.events ?? []) {
      const existing = eventsMap.get(ev.id)
      if (!existing || ev.type === 'tool_result') eventsMap.set(ev.id, ev)
    }
  }
  const events = Array.from(eventsMap.values())

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  if (events.length === 0) {
    return (
      <div style={procStyles.empty}>
        <span style={procStyles.emptyText}>暂无进程记录</span>
      </div>
    )
  }

  return (
    <div style={procStyles.list}>
      {events.map(ev => {
        const isRunning = ev.type === 'tool_start'
        const output = getResultOutput(ev.result)
        const isOpen = expanded.has(ev.id)
        const brief = getToolBrief(ev.input)
        const canExpand = !isRunning && !!output

        return (
          <div key={ev.id} style={procStyles.item}>
            {/* Item header */}
            <div
              style={{ ...procStyles.itemHeader, cursor: canExpand ? 'pointer' : 'default' }}
              onClick={() => canExpand && toggleExpand(ev.id)}
            >
              <span style={procStyles.statusDot}>
                {isRunning ? (
                  <LoadingOutlined style={{ color: '#4a9eff', fontSize: 12 }} />
                ) : ev.isError ? (
                  <CloseCircleOutlined style={{ color: 'var(--error, #f87171)', fontSize: 12 }} />
                ) : (
                  <CheckOutlined style={{ color: 'var(--success, #4ade80)', fontSize: 12 }} />
                )}
              </span>

              <div style={procStyles.itemInfo}>
                <span style={procStyles.statusLabel}>
                  {isRunning ? '运行中' : ev.isError ? '出错' : '已完成'}
                  &nbsp;
                  <span style={procStyles.toolName}>{TOOL_LABELS[ev.name] ?? ev.name}</span>
                </span>
                {brief && <span style={procStyles.brief}>{brief}</span>}
              </div>

              {ev.duration != null && (
                <span style={procStyles.duration}>{(ev.duration / 1000).toFixed(1)}s</span>
              )}
            </div>

            {/* Expandable terminal output */}
            {isOpen && output && (
              <div style={procStyles.terminal}>
                <pre style={procStyles.terminalPre}>{output}</pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── File tree ────────────────────────────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  onToggle,
}: {
  node: FileNode
  depth: number
  onToggle: (path: string) => void
}) {
  return (
    <div>
      <div
        style={{ ...fileStyles.node, paddingLeft: 12 + depth * 16 }}
        onClick={() => node.isDir && onToggle(node.path)}
      >
        <span style={fileStyles.nodeIcon}>
          {node.isDir ? (
            node.loading ? (
              <LoadingOutlined style={{ color: '#f6ad55', fontSize: 13 }} />
            ) : node.expanded ? (
              <FolderOpenOutlined style={{ color: '#f6ad55', fontSize: 13 }} />
            ) : (
              <FolderOutlined style={{ color: '#f6ad55', fontSize: 13 }} />
            )
          ) : (
            <FileOutlined style={{ color: 'var(--text-tertiary)', fontSize: 12 }} />
          )}
        </span>
        <span style={fileStyles.nodeName}>{node.name}</span>
      </div>

      {node.isDir && node.expanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilesView({ workspace }: { workspace: string }) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [search, setSearch] = useState('')
  const [rootLoading, setRootLoading] = useState(true)

  const loadRoot = useCallback(() => {
    setRootLoading(true)
    loadDir(workspace).then(nodes => {
      setTree(nodes)
      setRootLoading(false)
    })
  }, [workspace])

  useEffect(() => { loadRoot() }, [loadRoot])

  const handleToggle = useCallback(async (targetPath: string) => {
    // Find the node in current tree
    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const n of nodes) {
        if (n.path === targetPath) return n
        if (n.children) {
          const found = findNode(n.children)
          if (found) return found
        }
      }
      return null
    }

    setTree(prev => {
      const node = findNode(prev)
      if (!node) return prev
      if (node.expanded) {
        // Collapse
        return updateNode(prev, targetPath, { expanded: false })
      } else if (node.children) {
        // Already loaded, just expand
        return updateNode(prev, targetPath, { expanded: true })
      } else {
        // Need to load — mark as loading first
        return updateNode(prev, targetPath, { loading: true })
      }
    })

    // Load children if needed
    const node = (() => {
      const findNode = (nodes: FileNode[]): FileNode | null => {
        for (const n of nodes) {
          if (n.path === targetPath) return n
          if (n.children) { const f = findNode(n.children); if (f) return f }
        }
        return null
      }
      return findNode(tree)
    })()

    if (node && !node.expanded && !node.children) {
      const children = await loadDir(targetPath)
      setTree(prev => updateNode(prev, targetPath, { expanded: true, loading: false, children }))
    }
  }, [tree])

  const displayTree = search.trim()
    ? filterNodes(tree, search.toLowerCase())
    : tree

  return (
    <div style={fileStyles.container}>
      {/* Search bar */}
      <div style={fileStyles.searchWrap}>
        <SearchOutlined style={fileStyles.searchIcon} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索文件..."
          style={fileStyles.searchInput}
        />
        <button style={fileStyles.reloadBtn} onClick={loadRoot} title="刷新">
          <ReloadOutlined style={{ fontSize: 12 }} />
        </button>
      </div>

      {/* Tree content */}
      <div style={fileStyles.treeScroll}>
        {rootLoading ? (
          <div style={fileStyles.placeholder}>
            <LoadingOutlined style={{ marginRight: 6 }} /> 加载中...
          </div>
        ) : !isElectron() ? (
          <div style={fileStyles.placeholder}>在 Electron 中可查看文件</div>
        ) : displayTree.length === 0 ? (
          <div style={fileStyles.placeholder}>
            {search ? '无匹配文件' : '工作区为空'}
          </div>
        ) : (
          displayTree.map(node => (
            <FileTreeNode key={node.path} node={node} depth={0} onToggle={handleToggle} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── PreviewPanel ─────────────────────────────────────────────────────────────

export default function PreviewPanel({ messages, workspace, onClose }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('process')

  return (
    <div style={panelStyles.panel}>
      {/* Tab bar */}
      <div style={panelStyles.tabBar}>
        <div style={panelStyles.tabs}>
          {(['process', 'files'] as TabId[]).map(tab => (
            <button
              key={tab}
              style={{
                ...panelStyles.tab,
                ...(activeTab === tab ? panelStyles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'process' ? '当前进程' : '文件'}
            </button>
          ))}
        </div>
        <button style={panelStyles.closeBtn} onClick={onClose} title="关闭预览">
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>
      </div>

      {/* Content */}
      <div style={panelStyles.content}>
        {activeTab === 'process' ? (
          <ProcessView messages={messages} />
        ) : (
          <FilesView workspace={workspace} />
        )}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--bg-primary)',
    borderLeft: '1px solid var(--border-light)',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    borderBottom: '1px solid var(--border-light)',
    height: 42,
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: 2,
  },
  tab: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-tertiary)',
    transition: 'color 0.15s, background 0.15s',
    fontFamily: 'inherit',
  },
  tabActive: {
    color: 'var(--text-primary)',
    background: 'var(--active-bg)',
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 0,
    transition: 'background 0.15s, color 0.15s',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
}

const procStyles: Record<string, React.CSSProperties> = {
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emptyText: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
  },
  item: {
    margin: '0 10px 6px',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid var(--border-light)',
    background: 'var(--bg-secondary)',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '9px 12px',
  },
  statusDot: {
    marginTop: 1,
    flexShrink: 0,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statusLabel: {
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  toolName: {
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  brief: {
    fontSize: 11.5,
    color: 'var(--text-tertiary)',
    fontFamily: "'IBM Plex Mono', monospace",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  duration: {
    fontSize: 11,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
    marginTop: 1,
  },
  terminal: {
    borderTop: '1px solid var(--border-light)',
    background: '#0d1117',
    maxHeight: 240,
    overflow: 'auto',
  },
  terminalPre: {
    margin: 0,
    padding: '10px 14px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    lineHeight: 1.6,
    color: '#c9d1d9',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
}

const fileStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid var(--border-light)',
    flexShrink: 0,
  },
  searchIcon: {
    fontSize: 13,
    color: 'var(--text-tertiary)',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: 13,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  },
  reloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 5,
    background: 'transparent',
    cursor: 'pointer',
    color: 'var(--text-tertiary)',
    padding: 0,
    flexShrink: 0,
  },
  treeScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px 0',
  },
  node: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    cursor: 'pointer',
    paddingRight: 12,
    transition: 'background 0.1s',
  },
  nodeIcon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  nodeName: {
    fontSize: 13,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  placeholder: {
    padding: '24px 16px',
    fontSize: 13,
    color: 'var(--text-tertiary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
