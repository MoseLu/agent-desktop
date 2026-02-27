# ChatInput 组件族

## 概述

ChatInput 是一组可复用的输入框组件，专为聊天和任务输入场景设计。它支持自动高度调整、自定义工具栏、自定义 placeholder 等功能。

## 组件列表

### 1. ChatInput（主组件）

核心输入框组件，提供基础功能和样式。

**特性：**
- ✅ 自动根据内容调整高度
- ✅ 支持受控/非受控的 focused 状态
- ✅ 自定义工具栏（renderToolbar）
- ✅ 自定义额外内容（renderExtraContent）
- ✅ Enter 发送，Shift+Enter 换行

**使用示例：**

```tsx
import { ChatInput } from '@ui'

function MyComponent() {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  return (
    <ChatInput
      value={input}
      onChange={setInput}
      onSubmit={(val) => console.log('提交:', val)}
      placeholder="输入消息..."
      focused={focused}
      onFocusChange={setFocused}
      renderToolbar={({ isFocused }) => (
        <ChatInputToolbar
          leftContent={<button>附件</button>}
          rightContent={<button>发送</button>}
        />
      )}
      renderExtraContent={({ isFocused }) => (
        <>
          <ChatInputPlaceholder value={input} placeholder="请输入..." />
          {isFocused && <div className="focus-indicator" />}
        </>
      )}
    />
  )
}
```

**Props：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | string | - | 输入值（受控） |
| onChange | (value: string) => void | - | 值变化回调 |
| onSubmit | (value: string) => void | - | 提交回调（Enter 键） |
| placeholder | string | '' | 占位符文本 |
| disabled | boolean | false | 是否禁用 |
| focused | boolean | - | 聚焦状态（受控） |
| onFocusChange | (focused: boolean) => void | - | 聚焦状态变化回调 |
| renderToolbar | ({ isFocused }) => ReactNode | - | 渲染底部工具栏 |
| renderExtraContent | ({ isFocused }) => ReactNode | - | 渲染额外内容（如 placeholder） |
| style | CSSProperties | - | 自定义样式 |
| minRows | number | 3 | 最小行数 |
| maxRows | number | 8 | 最大行数 |

---

### 2. ChatInputToolbar

工具栏组件，用于显示操作按钮和状态信息。

**使用示例：**

```tsx
import { ChatInputToolbar } from '@ui'

<ChatInputToolbar
  leftContent={
    <>
      <IconButton icon={<AttachIcon />} />
      <IconButton icon={<SlidersIcon />} />
    </>
  }
  rightContent={
    <>
      <span>工作区名称</span>
      <button>发送</button>
    </>
  }
/>
```

**Props：**

| 属性 | 类型 | 说明 |
|------|------|------|
| leftContent | ReactNode | 左侧内容 |
| rightContent | ReactNode | 右侧内容 |
| style | CSSProperties | 自定义样式 |

---

### 3. ChatInputPlaceholder

自定义占位符组件，支持复杂的 placeholder 逻辑（如轮播、Tab 填充）。

**使用示例：**

```tsx
import { ChatInputPlaceholder } from '@ui'

// 简单用法
<ChatInputPlaceholder value={input} placeholder="请输入..." />

// 带 Tab 填充按钮
<ChatInputPlaceholder
  value={input}
  placeholder="按 Tab 快速填充"
  onTabClick={() => setInput('预设文本')}
  showTabBadge
/>
```

**Props：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| value | string | - | 当前输入值（用于判断是否显示） |
| placeholder | string | - | 占位符文本 |
| onTabClick | () => void | - | Tab 按钮点击回调 |
| showTabBadge | boolean | false | 是否显示 Tab 徽章 |
| style | CSSProperties | - | 自定义样式 |

---

## 完整使用模式

### 场景 1：简单聊天输入

```tsx
<ChatInput
  value={message}
  onChange={setMessage}
  onSubmit={sendMessage}
  placeholder="输入消息..."
  renderToolbar={() => (
    <ChatInputToolbar
      leftContent={<IconButton icon={<EmojiIcon />} />}
      rightContent={<IconButton icon={<SendIcon />} onClick={sendMessage} />}
    />
  )}
/>
```

### 场景 2：复杂任务输入（如 HomePage）

```tsx
<ChatInput
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  focused={focused}
  onFocusChange={setFocused}
  renderExtraContent={({ isFocused }) => (
    <>
      <ChatInputPlaceholder
        value={input}
        placeholder={currentPlaceholder}
        onTabClick={handleTabClick}
        showTabBadge
      />
      {isFocused && <div style={styles.focusIndicator} />}
    </>
  )}
  renderToolbar={() => (
    <ChatInputToolbar
      leftContent={
        <>
          <IconButton icon={<AttachIcon />} />
          <IconButton icon={<SlidersIcon />} />
          <div>工作区信息</div>
        </>
      }
      rightContent={
        <>
          <span>模型名称</span>
          <ModeSwitcher />
          <button onClick={() => handleSubmit(input)}>发送</button>
        </>
      }
    />
  )}
/>
```

### 场景 3：简洁模式（如 ChatPage）

```tsx
<ChatInput
  value={input}
  onChange={setInput}
  onSubmit={sendMessage}
  placeholder="继续输入任务..."
  disabled={isRunning}
  renderToolbar={() => (
    <ChatInputToolbar
      leftContent={<IconButton icon={<AttachIcon />} />}
      rightContent={
        <>
          <div>工作区</div>
          <div>模式</div>
          <button onClick={() => sendMessage()}>发送</button>
        </>
      }
    />
  )}
/>
```

---

## 样式定制

### 修改聚焦状态样式

```tsx
<ChatInput
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  style={{
    border: '2px solid var(--accent-primary)',
    borderRadius: 12,
  }}
/>
```

### 自定义焦点指示器

```tsx
renderExtraContent={({ isFocused }) => (
  <>
    <ChatInputPlaceholder value={input} placeholder="输入..." />
    {isFocused && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
      }} />
    )}
  </>
)}
```

---

## 注意事项

1. **自动高度**：组件会根据内容自动调整高度，范围在 `minRows` 和 `maxRows` 之间
2. **受控模式**：建议使用受控的 `focused` 状态以获得更好的控制
3. **Placeholder**：使用 `ChatInputPlaceholder` 而不是原生 placeholder 属性，以获得更多自定义能力
4. **工具栏**：工具栏内容完全自定义，可以根据需要添加任何组件
5. **性能**：避免在 `renderToolbar` 和 `renderExtraContent` 中创建新对象，使用 useMemo 优化

---

## 迁移指南

### 从旧代码迁移

**之前：**
```tsx
<div style={styles.inputBox}>
  <textarea
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="输入..."
  />
  <div style={styles.toolbar}>
    <button>附件</button>
    <button>发送</button>
  </div>
</div>
```

**现在：**
```tsx
<ChatInput
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  placeholder="输入..."
  renderToolbar={() => (
    <ChatInputToolbar
      leftContent={<button>附件</button>}
      rightContent={<button>发送</button>}
    />
  )}
/>
```

---

## 设计令牌

组件使用以下设计令牌：

- `--border-medium` - 边框颜色
- `--input-bg` - 输入框背景
- `--input-border-focused` - 聚焦时边框颜色
- `--text-primary` - 主要文本颜色
- `--text-tertiary` - 占位符文本颜色
- `--accent-primary` - 强调色（焦点指示器）

确保这些令牌在全局样式中已定义。
