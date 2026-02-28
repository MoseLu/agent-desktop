# 模型切换功能实现文档

## 概述

已实现**随时切换模型**功能，用户可以在 HomePage 和 ChatPage 的输入框工具栏中快速切换 MiniMax 和 Qwen（包含百炼 Coding Plan）下的可用模型。

---

## 实现的功能

### 1. ModelSelector 组件（`src/components/ui/ModelSelector.tsx`）

一个下拉式模型选择器组件，支持：

- **按组筛选**：百炼 Coding Plan、MiniMax、Qwen、全部
- **模型分组显示**：带颜色标识的组别标签
- **推荐标签**：显示"推荐"、"最新编程"、"快速"等描述
- **选中状态**：清晰显示当前选中的模型
- **外部点击关闭**：点击组件外部自动关闭下拉框

**模型列表：**

| 组别 | 模型 | 描述 |
|------|------|------|
| **百炼 Coding Plan** | Qwen3.5 Plus | 推荐 |
| | Qwen3 Coder Next | 最新编程 |
| | Qwen Turbo | 快速 |
| **MiniMax** | MiniMax M2.5 | 推荐 |
| | MiniMax Text-01 | - |
| **通义千问 Qwen** | Qwen Plus | - |
| | Qwen Max | - |
| **Claude** | Claude Sonnet 4 | - |
| | Claude Haiku 4.5 | - |

---

### 2. HomePage 集成（`src/components/pages/HomePage.tsx`）

在首页输入框工具栏的右侧添加了模型切换器：

```tsx
<ModelSelector
  value={settings.model || 'qwen3.5-plus'}
  onChange={(newModel) => {
    window.electron.saveSettings({ model: newModel })
    message.success(`已切换到 ${newModel}`, 1500)
  }}
/>
```

**位置**：在模式切换器（高效/全能）左侧

---

### 3. ChatPage 集成（`src/components/pages/ChatPage.tsx`）

在聊天页输入框工具栏的右侧添加了模型切换器：

```tsx
<ModelSelector
  value={settings.model || 'qwen3.5-plus'}
  onChange={(newModel) => {
    window.electron.saveSettings({ model: newModel })
    message.success(`已切换到 ${newModel}`, 1500)
  }}
/>
```

**位置**：在模式指示器（全能/高效）右侧，发送按钮左侧

---

## 使用流程

### 切换模型的步骤

1. **点击模型名称按钮**（如 "Qwen3.5 Plus"）
2. **下拉面板展开**，显示所有可用模型
3. **（可选）点击组别筛选**：
   - 全部
   - 百炼 Coding Plan
   - MiniMax
   - Qwen
4. **点击目标模型**，立即切换
5. **显示提示消息**："已切换到 [模型名称]"

### 默认模型

- 默认选中 **Qwen3.5 Plus**（百炼 Coding Plan 推荐模型）
- 首次启动时使用设置中的默认值
- 切换后自动保存到 electron-store

---

## 技术实现

### ModelSelector 组件结构

```
ModelSelector
├── 触发器按钮（显示当前模型）
│   ├── 模型名称标签
│   └── Chevron 下箭头图标
└── 下拉面板（isOpen 时显示）
    ├── 组别筛选栏
    │   ├── 全部
    │   ├── 百炼 Coding Plan
    │   ├── MiniMax
    │   └── Qwen
    └── 模型列表
        ├── 百炼 Coding Plan 组
        │   ├── Qwen3.5 Plus
        │   ├── Qwen3 Coder Next
        │   └── Qwen Turbo
        ├── MiniMax 组
        │   ├── MiniMax M2.5
        │   └── MiniMax Text-01
        ├── Qwen 组
        │   ├── Qwen Plus
        │   └── Qwen Max
        └── Claude 组
            ├── Claude Sonnet 4
            └── Claude Haiku 4.5
```

### 状态管理

```typescript
const [isOpen, setIsOpen] = useState(false)  // 下拉框开/关
const [selectedGroup, setSelectedGroup] = useState<'all' | 'minimax' | 'qwen' | 'qwen-coding'>('all')  // 筛选组别
```

### 样式特点

- **位置**：绝对定位，底部对齐（显示在触发器上方）
- **尺寸**：宽 320px，最大高度 420px（可滚动）
- **颜色**：使用 CSS 变量，支持主题切换
- **组别颜色**：
  - 百炼 Coding Plan：紫色 `#6366f1`
  - MiniMax：琥珀色 `#f59e0b`
  - Qwen：绿色 `#10b981`
  - Claude：粉色 `#ec4899`

---

## 与代理配置的集成

模型切换后，Agent 执行时会自动使用对应 provider 的 API Key：

```javascript
// electron/agent/service.js
if (m.includes('coding')) {
  apiKey = proxyCfg.get('qwenCoding')?.apiKey || ''  // 百炼 Coding Plan
} else if (m.includes('qwen')) {
  apiKey = proxyCfg.get('qwen')?.apiKey || ''        // 普通 Qwen
} else if (m.includes('minimax')) {
  apiKey = proxyCfg.get('minimax')?.apiKey || ''     // MiniMax
}
```

**用户配置流程：**

1. 打开设置 → 代理配置
2. 在"百炼 Coding Plan"卡片中输入 API Key
3. 返回首页或聊天页
4. 点击模型切换器，选择任意 Qwen 模型
5. 自动使用 Coding Plan 的 API Key 和 Base URL

---

## 修改的文件

### 新增文件

- `src/components/ui/ModelSelector.tsx`（287 行）

### 修改文件

- `src/components/pages/HomePage.tsx`
  - 添加 ModelSelector 导入
  - 在工具栏 rightContent 中添加模型切换器
  
- `src/components/pages/ChatPage.tsx`
  - 添加 ModelSelector 和 message 导入
  - 移除原有的模型名称显示（替换为 ModelSelector）

- `electron/proxy/config.js`（之前已完成）
  - 添加 qwenCoding provider 配置
  
- `src/components/modals/SettingsModal.tsx`（之前已完成）
  - 模型列表中添加百炼 Coding Plan 分组
  - 代理配置页面添加百炼 Coding Plan provider

---

## 视觉效果

### 触发器按钮（关闭状态）

```
┌─────────────────────┐
│ Qwen3.5 Plus      ▼ │
└─────────────────────┘
```

### 下拉面板（展开状态）

```
┌──────────────────────────────────────┐
│ [全部] [百炼 Coding Plan] [MiniMax]  │
├──────────────────────────────────────┤
│ ● 百炼 Coding Plan                   │
│   Qwen3.5 Plus        推荐        ✓  │
│   Qwen3 Coder Next    最新编程       │
│   Qwen Turbo          快速           │
├──────────────────────────────────────┤
│ ● MiniMax                            │
│   MiniMax M2.5        推荐           │
│   MiniMax Text-01                    │
└──────────────────────────────────────┘
```

---

## 测试建议

### 功能测试

1. **基本切换**
   - [ ] 点击模型按钮，下拉框展开
   - [ ] 选择不同模型，立即生效
   - [ ] 显示切换成功提示

2. **组别筛选**
   - [ ] 点击"百炼 Coding Plan"，只显示该组模型
   - [ ] 点击"全部"，显示所有模型
   - [ ] 筛选后选择模型，正确应用

3. **外部点击**
   - [ ] 展开下拉框后点击外部，自动关闭
   - [ ] 不会误触发模型切换

4. **状态持久化**
   - [ ] 切换模型后刷新页面，保持选中状态
   - [ ] 重启应用后，模型设置保留

### 视觉测试

1. **主题兼容**
   - [ ] 浅色主题下正常显示
   - [ ] 深色主题下正常显示
   - [ ] 组别颜色清晰可辨

2. **响应式**
   - [ ] 不同窗口尺寸下拉框位置正确
   - [ ] 模型列表过长时出现滚动条

---

## 后续优化建议

### 短期

- [ ] 添加模型切换动画（淡入淡出）
- [ ] 支持键盘导航（上下箭头选择，Enter 确认）
- [ ] 添加最近使用的模型快捷入口

### 中期

- [ ] 支持用户自定义模型列表
- [ ] 支持从配置文件加载模型选项
- [ ] 添加模型使用统计（使用次数、时长）

### 长期

- [ ] 支持多 provider 负载均衡
- [ ] 智能推荐模型（根据任务类型）
- [ ] 模型性能对比展示

---

## 参考资料

- [MiniMax Agent Desktop](https://github.com/MiniMax-AI/MiniMax-Agent-Desktop) - 模型切换参考
- [百炼 Coding Plan 文档](https://help.aliyun.com/zh/model-studio/developer-reference/claude-code)
- [ModelSelector 组件代码](../src/components/ui/ModelSelector.tsx)

---

**最后更新**: 2026-02-28  
**维护者**: Agent Desktop Team
