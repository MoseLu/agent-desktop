/**
 * 环境检测工具
 * 
 * 用于判断当前运行环境是 Electron 还是浏览器
 */

/**
 * 判断是否在 Electron 渲染进程中运行
 * 
 * @example
 * // 基本使用
 * if (isElectron()) {
 *   window.electron.saveSettings(...)
 * } else {
 *   // 浏览器开发模式
 *   console.log('Running in browser')
 * }
 * 
 * @example
 * // 条件执行
 * const settings = isElectron() 
 *   ? await window.electron.getSettings()
 *   : mockSettings
 */
export function isElectron(): boolean {
  // 检查是否在 Electron 渲染进程中
  return !!(
    typeof window !== 'undefined' &&
    window.electron !== undefined
  )
}

/**
 * 判断是否在浏览器开发模式中运行
 * 
 * @example
 * if (isBrowser()) {
 *   // 使用模拟数据
 *   return mockSettings
 * }
 */
export function isBrowser(): boolean {
  return !isElectron()
}

/**
 * 安全地调用 Electron API
 * 
 * @example
 * // 基本使用
 * const settings = await callElectron(() => window.electron.getSettings())
 * 
 * @example
 * // 带默认值
 * const folder = await callElectron(
 *   () => window.electron.pickFolder(),
 *   null
 * )
 * 
 * @param fn - 要执行的 Electron API 调用函数
 * @param defaultValue - 如果在浏览器中运行，返回的默认值
 * @returns API 调用结果或默认值
 */
export async function callElectron<T>(
  fn: () => Promise<T>,
  defaultValue?: T
): Promise<T | undefined> {
  if (!isElectron()) {
    return defaultValue
  }
  
  try {
    return await fn()
  } catch (error) {
    console.error('Electron API call failed:', error)
    return defaultValue
  }
}

/**
 * 安全地调用 Electron API（同步版本）
 * 
 * @example
 * const settings = callElectronSync(
 *   () => window.electron.getSettingsSync(),
 *   defaultSettings
 * )
 * 
 * @param fn - 要执行的 Electron API 调用函数
 * @param defaultValue - 如果在浏览器中运行，返回的默认值
 * @returns API 调用结果或默认值
 */
export function callElectronSync<T>(
  fn: () => T,
  defaultValue?: T
): T | undefined {
  if (!isElectron()) {
    return defaultValue
  }
  
  try {
    return fn()
  } catch (error) {
    console.error('Electron API call failed:', error)
    return defaultValue
  }
}
