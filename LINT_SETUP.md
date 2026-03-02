# Lint 和代码质量配置指南

## ✅ 已完成的配置

### 1. ESLint 配置

项目已配置 ESLint v10，使用新的配置文件格式 `eslint.config.js`。

**安装的依赖**:
- `eslint` v10.0.2
- `@typescript-eslint/parser` v8.56.1
- `@typescript-eslint/eslint-plugin` v8.56.1
- `typescript-eslint` v8.56.1
- `eslint-plugin-react` v7.37.5
- `eslint-plugin-react-hooks` v7.0.1
- `eslint-plugin-prettier` v5.5.5
- `eslint-config-prettier` v10.1.8
- `prettier` v3.8.1
- `globals` v17.4.0

**配置文件**:
- `eslint.config.js` - ESLint 配置（新格式）
- `.prettierrc` - Prettier 配置
- `.prettierignore` - Prettier 忽略文件

**npm 脚本**:
```bash
# 运行 ESLint 检查
pnpm lint

# 自动修复 ESLint 问题
pnpm lint:fix

# 使用 Prettier 格式化代码
pnpm format

# TypeScript 类型检查
pnpm typecheck
```

### 2. 规则配置

**启用的主要规则**:
- ✅ React Hooks 规则（rules-of-hooks, exhaustive-deps）
- ✅ TypeScript 推荐规则
- ✅ 未使用变量检查
- ✅ `any` 类型警告
- ✅ 开发环境允许 console，生产环境警告

**忽略的文件**:
- `node_modules/`
- `dist/`
- `dist-electron/`
- `**/*.js` (仅检查 TypeScript 文件)

### 3. Prettier 配置

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

## 📊 当前代码质量状态

### ESLint 检查结果

**总计**: 57 个问题
- **38 个错误**: 主要是未使用的变量和导入
- **19 个警告**: 主要是 `any` 类型和 React Hooks 依赖

**主要问题分类**:

1. **未使用的变量/导入** (约 25 个)
   - 未使用的 Icon 组件
   - 未使用的函数和状态

2. **any 类型使用** (约 15 个)
   - 主要在 electron-mock.ts 和 Message.tsx 中

3. **React Hooks 依赖** (约 5 个)
   - useEffect 缺少依赖项

4. **空接口** (约 5 个)
   - 可以转换为类型别名

### TypeScript 检查

**状态**: ✅ 通过（除了一个图片导入错误）

**配置**:
- 严格模式：启用
- noUnusedLocals: false（由 ESLint 处理）
- noUnusedParameters: false（由 ESLint 处理）
- skipLibCheck: true（跳过依赖库检查）

## 🎯 改进建议

### 短期（推荐立即执行）

1. **修复未使用的导入**
   ```bash
   pnpm lint --fix
   ```
   
2. **移除无用的 Icon 组件**
   - SettingsModal.tsx: BillingIcon, PointsIcon, ClockIcon
   - HomePage.tsx: AlarmClockIcon, DocumentIcon, RadarIcon, WhiteboardIcon

3. **修复 ChatPage.tsx 未使用的变量**
   - workspace
   - handleSelectWorkspace

### 中期（可选优化）

4. **替换剩余的 any 类型**
   - Message.tsx 中的泛型
   - electron-mock.ts 中的回调参数

5. **完善 React Hooks 依赖**
   - App.tsx useEffect 依赖数组

### 长期（架构改进）

6. **考虑启用 noUnusedLocals**
   - 修改 tsconfig.json
   - 一次性修复所有未使用变量
   - 防止新代码产生类似问题

## 📝 开发工作流建议

### 提交前检查

```bash
# 1. 运行类型检查
pnpm typecheck

# 2. 运行 ESLint
pnpm lint

# 3. 格式化代码
pnpm format
```

### VS Code 配置

推荐安装以下扩展：
- ESLint
- Prettier - Code formatter

**settings.json**:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## ⚠️ 已知问题

1. **antd 6.x 类型兼容性**
   - antd 6.3.1 与 React 18 存在类型定义差异
   - 通过 skipLibCheck: true 跳过检查
   - 不影响运行时行为

2. **图片导入错误**
   - LoginPage.tsx 中的 `@asserts/avatar.jpg` 路径错误
   - 需要添加正确的文件扩展名或配置

3. **ModelOption 类型不匹配**
   - ModelSelector.tsx 中的模型选项缺少 id, name, provider 字段
   - 需要更新数据以匹配类型定义

## 🚀 下一步

1. 运行 `pnpm lint --fix` 自动修复可修复的问题
2. 手动修复剩余的未使用变量
3. 考虑添加 CI/CD 流程自动检查代码质量
4. 考虑添加测试框架（Vitest）

## 📚 参考文档

- [ESLint 文档](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Prettier 文档](https://prettier.io/docs/en/)
- [React Hooks 规则](https://react.dev/reference/rules/react-hooks)
