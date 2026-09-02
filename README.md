# uzVideo 源收集

个人收集、移植、维护的 [uzVideo](https://github.com/YYDS678/uzVideo) 影视扩展源仓库。

## 源索引

| 源名 | 类型 | 来源 | 状态 | 最后验证 |
|------|------|------|------|---------|
| 黄果短剧 | HTML刮削 | XPTV | ⚠️待测 | - |

> 状态说明：✅可用 / ⚠️待测 / ❌失效

## 使用方法

### 方式一：在线导入（推荐）

1. 点击下方源文件链接 → 右上角 **Raw** → 复制浏览器地址栏 URL
2. uzVideo App → **设置** → **扩展管理** → **+** → 粘贴 URL → 确认

| 源名 | 文件 | Raw URL |
|------|------|---------|
| 黄果短剧 | [sources/huangguo_uz.js](sources/huangguo_uz.js) | `https://raw.githubusercontent.com/InkiChang/uzVideo-sources/main/sources/huangguo_uz.js` |

### 方式二：聚合订阅导入

uzVideo App → **设置** → **扩展管理** → **+** → 粘贴以下订阅 URL：

```
https://raw.githubusercontent.com/InkiChang/uzVideo-sources/main/uzAio.json
```

### 方式三：本地导入

1. 下载 `sources/*.js` 到本地
2. uzVideo App → **设置** → **扩展管理** → **+** → **读取应用内文件** / 选择本地文件

## 仓库结构

```
sources/        移植好的、可直接用的源（uzVideo扩展格式）
raw/            原始源备份（按来源app分子目录，如 raw/xptv/）
docs/notes/     每个源的移植笔记
uzAio.json      聚合订阅清单（uzVideo可订阅导入）
```

## 移植说明

本仓库的源多为从其他 App（XPTV / TVBox 等）移植而来，移植规范见 [docs/notes/porting-guide.md](docs/notes/porting-guide.md)。

## 致谢

- [uzVideo](https://github.com/YYDS678/uzVideo) — uzVideo App
- [uzVideo-extensions](https://github.com/YYDS678/uzVideo-extensions) — 扩展模板与示例
- 各原始源作者（见 `raw/` 目录）
