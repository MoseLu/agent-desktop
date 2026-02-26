const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

const TOOL_DEFINITIONS = [
  {
    name: 'list_files',
    description: '列出目录中的文件和子目录，显示名称、类型、大小。',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目录路径，用 "." 表示工作区根目录' },
        recursive: { type: 'boolean', description: '是否递归列出子目录（最多2层）', default: false },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: '读取文件内容，返回文本。',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: '文件路径' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: '创建或覆盖文件，如需自动创建父目录。',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'move_file',
    description: '移动或重命名文件/目录。',
    input_schema: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        destination: { type: 'string' },
      },
      required: ['source', 'destination'],
    },
  },
  {
    name: 'delete_file',
    description: '删除单个文件（不删除目录）。',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'create_directory',
    description: '创建目录（含父级目录）。',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'execute_shell',
    description: '在工作区目录中执行 shell 命令，可调用 python、ffmpeg、git、node 等本地工具。',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string', description: '工作目录（默认为工作区根）' },
        timeout: { type: 'number', description: '超时秒数（默认30，最大120）' },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_files',
    description: '按文件名或文件内容搜索文件。',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        searchIn: { type: 'string' },
        type: { type: 'string', enum: ['filename', 'content'], default: 'filename' },
      },
      required: ['pattern'],
    },
  },
]

class ToolExecutor {
  constructor(workspace) {
    this.workspace = workspace
  }

  resolve(p) {
    return path.isAbsolute(p) ? p : path.join(this.workspace, p)
  }

  async execute(name, input) {
    try {
      switch (name) {
        case 'list_files': return await this.listFiles(input)
        case 'read_file': return await this.readFile(input)
        case 'write_file': return await this.writeFile(input)
        case 'move_file': return await this.moveFile(input)
        case 'delete_file': return await this.deleteFile(input)
        case 'create_directory': return await this.createDirectory(input)
        case 'execute_shell': return await this.executeShell(input)
        case 'search_files': return await this.searchFiles(input)
        default: return { error: `未知工具: ${name}` }
      }
    } catch (err) {
      return { error: err.message }
    }
  }

  async listFiles({ path: p, recursive = false }) {
    const dir = this.resolve(p)
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const items = []
    for (const e of entries) {
      const fp = path.join(dir, e.name)
      const stat = await fs.stat(fp).catch(() => null)
      if (!stat) continue
      items.push({ name: e.name, type: e.isDirectory() ? 'directory' : 'file', size: e.isDirectory() ? null : stat.size, modified: stat.mtime.toISOString(), path: fp })
      if (recursive && e.isDirectory()) {
        const sub = await fs.readdir(fp, { withFileTypes: true }).catch(() => [])
        for (const s of sub) {
          const sstat = await fs.stat(path.join(fp, s.name)).catch(() => null)
          if (sstat) items.push({ name: `  ${e.name}/${s.name}`, type: s.isDirectory() ? 'directory' : 'file', size: s.isDirectory() ? null : sstat.size, modified: sstat.mtime.toISOString(), path: path.join(fp, s.name) })
        }
      }
    }
    return { path: dir, count: items.length, items: items.sort((a, b) => (b.type === 'directory' ? 1 : 0) - (a.type === 'directory' ? 1 : 0) || a.name.localeCompare(b.name)) }
  }

  async readFile({ path: p }) {
    const fp = this.resolve(p)
    const stat = await fs.stat(fp)
    if (stat.size > 1024 * 1024) return { error: '文件过大(>1MB)' }
    const content = await fs.readFile(fp, 'utf-8')
    return { path: fp, content, lines: content.split('\n').length }
  }

  async writeFile({ path: p, content }) {
    const fp = this.resolve(p)
    await fs.mkdir(path.dirname(fp), { recursive: true })
    await fs.writeFile(fp, content, 'utf-8')
    return { path: fp, written: content.length, ok: true }
  }

  async moveFile({ source, destination }) {
    const src = this.resolve(source), dst = this.resolve(destination)
    await fs.mkdir(path.dirname(dst), { recursive: true })
    await fs.rename(src, dst)
    return { source: src, destination: dst, ok: true }
  }

  async deleteFile({ path: p }) {
    const fp = this.resolve(p)
    const stat = await fs.stat(fp)
    if (stat.isDirectory()) return { error: '不能删除目录' }
    await fs.unlink(fp)
    return { path: fp, ok: true }
  }

  async createDirectory({ path: p }) {
    const fp = this.resolve(p)
    await fs.mkdir(fp, { recursive: true })
    return { path: fp, ok: true }
  }

  async executeShell({ command, cwd, timeout = 30 }) {
    const wd = cwd ? this.resolve(cwd) : this.workspace
    const { stdout, stderr } = await execAsync(command, { cwd: wd, timeout: Math.min(timeout, 120) * 1000, maxBuffer: 8 * 1024 * 1024 }).catch(e => ({ stdout: e.stdout || '', stderr: e.stderr || e.message }))
    return { command, cwd: wd, output: (stdout + (stderr ? `\n[stderr]\n${stderr}` : '')).slice(0, 8000), ok: true }
  }

  async searchFiles({ pattern, searchIn, type = 'filename' }) {
    const dir = this.resolve(searchIn || '.')
    const cmd = type === 'content'
      ? (process.platform === 'win32' ? `findstr /s /i /m "${pattern}" "${dir}\\*"` : `grep -rl "${pattern}" "${dir}" 2>/dev/null | head -50`)
      : (process.platform === 'win32' ? `dir /s /b "${dir}\\*${pattern}*"` : `find "${dir}" -name "*${pattern}*" 2>/dev/null | head -50`)
    const { stdout } = await execAsync(cmd, { timeout: 15000 }).catch(() => ({ stdout: '' }))
    return { matches: stdout.trim().split('\n').filter(Boolean) }
  }
}

module.exports = { TOOL_DEFINITIONS, ToolExecutor }
