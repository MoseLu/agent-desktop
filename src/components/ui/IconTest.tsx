import React, { useEffect, useState } from 'react'

/**
 * 图标测试组件 - 用于调试 SVG Sprite
 */
export const IconTest: React.FC = () => {
  const [svgContent, setSvgContent] = useState<string>('')

  useEffect(() => {
    // 获取注入的 SVG sprite
    const svgSprite = document.getElementById('__svg__icons__dom__')
    if (svgSprite) {
      setSvgContent(svgSprite.innerHTML)
      console.log('SVG Sprite 内容:', svgSprite.innerHTML)
      console.log('SVG Sprite 元素:', svgSprite)
    } else {
      console.warn('未找到 SVG Sprite 元素！')
    }
  }, [])

  return (
    <div style={{ padding: 20, background: '#f0f0f0', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 10px' }}>图标调试信息</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* 测试所有图标 */}
        <div style={{ border: '1px solid #ddd', padding: 10, borderRadius: 4 }}>
          <div style={{ fontSize: 12, marginBottom: 5 }}>Logo (system)</div>
          <svg width={32} height={32} style={{ color: 'blue' }}>
            <use href="#icon-system-Logo" fill="currentColor" />
          </svg>
        </div>
        
        <div style={{ border: '1px solid #ddd', padding: 10, borderRadius: 4 }}>
          <div style={{ fontSize: 12, marginBottom: 5 }}>Plus (action)</div>
          <svg width={32} height={32} style={{ color: 'red' }}>
            <use href="#icon-action-Plus" fill="currentColor" />
          </svg>
        </div>

        <div style={{ border: '1px solid #ddd', padding: 10, borderRadius: 4 }}>
          <div style={{ fontSize: 12, marginBottom: 5 }}>Collapse (navigation)</div>
          <svg width={32} height={32} style={{ color: 'green' }}>
            <use href="#icon-navigation-Collapse" fill="currentColor" />
          </svg>
        </div>
      </div>

      {svgContent && (
        <details style={{ marginTop: 10, fontSize: 12 }}>
          <summary>查看 SVG Sprite 内容</summary>
          <pre style={{ 
            background: '#fff', 
            padding: 10, 
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 300,
          }}>
            {svgContent}
          </pre>
        </details>
      )}
    </div>
  )
}

export default IconTest
