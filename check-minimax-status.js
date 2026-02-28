/**
 * MiniMax CodingPlan 状态检查工具
 * 检查 API Key 类型和剩余额度
 */

const MINI_MAX_API_KEY = 'sk-cp-JHl5IpVtLuCywAIZ41BJwHCCXf_toYtgB4hy583Y6lPC3E-Q7x2PY1ytcuVZnUV7udsWLDEc2kh8WSDWFTRHfN_h53MpaFhMh-wC4R3tnl_Mf-Zl4e_-E2c'

async function checkAPIKey() {
  console.log('🔍 检查 MiniMax API Key 信息...\n')
  console.log('API Key:', MINI_MAX_API_KEY)
  console.log('Key 前缀:', MINI_MAX_API_KEY.substring(0, 10))
  
  // 检查 Key 的类型
  if (MINI_MAX_API_KEY.startsWith('sk-cp-')) {
    console.log('✅ Key 类型：CodingPlan API Key (sk-cp- 前缀)')
  } else if (MINI_MAX_API_KEY.startsWith('sk-')) {
    console.log('⚠️  Key 类型：普通 API Key (sk- 前缀)')
    console.log('   ❗ CodingPlan 需要使用 sk-cp- 开头的 Key')
  } else {
    console.log('❓ Key 类型：未知')
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 尝试获取 CodingPlan 剩余额度...\n')
  
  try {
    // 尝试调用额度查询接口
    const response = await fetch('https://www.minimax.io/v1/api/openplatform/coding_plan/remains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MINI_MAX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('HTTP 状态:', response.status)
    
    const data = await response.json()
    console.log('\n📝 响应数据:')
    console.log(JSON.stringify(data, null, 2))
    
    if (response.ok && data.data) {
      console.log('\n✅ 额度信息:')
      console.log('   剩余额度:', data.data.remaining || '未知')
      console.log('   已用额度:', data.data.used || '0')
      console.log('   总额度:', data.data.total || '未知')
      return true
    } else {
      console.log('\n❌ 查询失败:', data.message || data.error || '未知错误')
      return false
    }
    
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
    return false
  }
}

async function testTextCompletion() {
  console.log('\n' + '='.repeat(50))
  console.log('📝 测试文本生成接口...\n')
  
  try {
    const response = await fetch('https://api.minimaxi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINI_MAX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'user', content: '你好' }
        ],
        max_tokens: 10
      })
    })
    
    console.log('HTTP 状态:', response.status)
    
    const data = await response.json()
    
    if (response.ok) {
      console.log('\n✅ 文本生成测试成功!')
      console.log('回复:', data.choices?.[0]?.message?.content || '无内容')
      return true
    } else {
      console.log('\n❌ 文本生成测试失败')
      console.log('错误:', data.error?.message || JSON.stringify(data))
      return false
    }
    
  } catch (error) {
    console.error('\n❌ 请求失败:', error.message)
    return false
  }
}

// 运行检查
async function main() {
  console.log('='.repeat(50))
  console.log('MiniMax CodingPlan 状态检查工具')
  console.log('='.repeat(50) + '\n')
  
  const keyValid = await checkAPIKey()
  const apiValid = await testTextCompletion()
  
  console.log('\n' + '='.repeat(50))
  console.log('📋 检查总结')
  console.log('='.repeat(50))
  
  if (keyValid && apiValid) {
    console.log('✅ 所有检查通过！API Key 可用')
  } else if (!keyValid) {
    console.log('❌ API Key 无效或额度不足')
    console.log('💡 建议：')
    console.log('   1. 访问 https://platform.minimaxi.com 检查订阅状态')
    console.log('   2. 确认使用的是 CodingPlan API Key (sk-cp- 开头)')
    console.log('   3. 在用户中心查看剩余额度')
  } else {
    console.log('⚠️  API Key 有效，但服务不可用')
  }
  
  console.log('='.repeat(50))
}

main().catch(console.error)
