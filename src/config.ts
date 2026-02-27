/**
 * 应用配置
 * 统一存储应用级别的配置项
 */

export const appConfig = {
  // 应用名称
  appName: 'Agent Desktop',
  
  // 应用描述
  appDescription: '让你的工作更轻松',
  
  // 设置面板标题
  settingsTitle: '设置',
  
  // 设置面板描述文本
  settingsDescriptions: {
    account: '个性化设置他人在 Agent Desktop 上看到和与您互动的方式',
    general: '配置 Agent Desktop 的核心功能',
    billing: '查看和管理您的订阅与消费记录',
    points: '查看积分余额和积分获取记录',
    scheduled: '设置自动执行的周期性任务',
    desktopGeneral: '自定义桌面应用的外观和行为',
    notifications: '管理应用通知和提醒设置',
  },
  
  // 默认工作区名称
  defaultWorkspace: '工作区',
  
  // 默认用户名
  defaultUserName: '开发者',
  
  // 默认用户套餐
  defaultUserPlan: '免费',
} as const

export type AppConfig = typeof appConfig
