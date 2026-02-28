import type { CSSProperties } from 'react'

export const styles: Record<string, CSSProperties> = {
  // TabBar 容器
  tabBar: {
    height: 40,
    background: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'flex-end', // 底部对齐，让卡片向上延伸
    padding: '0', // 移除所有 padding，让卡片与边缘对齐
    gap: 0, // 移除 gap，让卡片紧密排列
    overflowX: 'auto',
    overflowY: 'hidden',
    flexShrink: 0,
    scrollbarWidth: 'none', // Firefox
    msOverflowStyle: 'none', // IE/Edge
  },
  // Tab 项（卡片式，填满高度）
  tabItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between', // 左右分布：文本在左，关闭按钮在右
    padding: '0 8px', // 左右间距与关闭按钮到右侧的间距一致
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-secondary)',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-light)',
    borderBottom: 'none',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    minWidth: 100,
    maxWidth: 200,
    height: 40, // 与 TabBar 高度一致
    boxSizing: 'border-box',
  },
  // Tab 项 hover 状态
  tabItemHover: {
    background: 'var(--hover-bg)',
    color: 'var(--text-primary)',
  },
  // Tab 项激活状态（卡片式高亮）
  tabItemActive: {
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
    borderBottom: '1px solid var(--bg-primary)',
    fontWeight: 500,
    boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
    height: 40, // 与 TabBar 高度一致
    marginBottom: '-1px', // 向下延伸 1px，覆盖底部边框
  },
  // Tab 标题
  tabTitle: {
    flex: 1, // 占据剩余空间
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left', // 左对齐
    marginRight: 4, // 与关闭按钮保持一点距离
  },
  // 关闭按钮（固定在右侧）
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: '4px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
    opacity: 0,
    transition: 'opacity 0.15s, background 0.15s',
    lineHeight: 1,
    flexShrink: 0, // 不压缩关闭按钮
  },
  // 关闭按钮 hover 状态
  closeBtnVisible: {
    opacity: 1,
  },
  // 关闭按钮 hover 时背景
  closeBtnHover: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  // 默认标签（不可关闭）
  defaultTab: {
    cursor: 'default',
  },
  // 新建按钮
  newTabBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40, // 增大尺寸
    height: 40, // 增大尺寸
    borderRadius: '6px',
    border: '1px dashed var(--border-medium)', // 虚线边框
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 24, // 增大图标
    padding: 0,
    transition: 'all 0.15s',
    flexShrink: 0,
    marginBottom: 0, // 删除 gap，与卡片底部对齐
  },
  newTabBtnHover: {
    background: 'var(--hover-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-dark)',
  },
  // ─── 模式切换器（顶栏右侧）
  modeSwitcherWrap: {
    display: 'flex',
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 8,
    flexShrink: 0,
    marginLeft: 'auto',
  },
  modeSwitcher: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-medium)',
    borderRadius: 8,
    padding: 3,
  },
  modeBtn: {
    padding: '3px 12px',
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'inherit',
    lineHeight: '18px',
  },
  modeBtnActive: {
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  modeBtnDisabled: {
    opacity: 0.38,
    cursor: 'not-allowed',
  },
}
