# 移植规范：其他 App 源 → uzVideo 扩展

## 目标格式

uzVideo JS 扩展（type 101），需实现以下 7 个接口：

| 接口 | 作用 | 必填 |
|------|------|------|
| `getClassList()` | 一级分类（Tab 列表） | ✅ |
| `getSubclassList(args)` | 二级分类 | 可空 |
| `getSubclassVideoList(args)` | 二级分类视频 | 可空 |
| `getVideoList(args)` | 分类视频列表 | ✅ |
| `getVideoDetail(args)` | 视频详情 + 集数 | ✅ |
| `getVideoPlayUrl(args)` | 播放地址（m3u8） | ✅ |
| `searchVideo(args)` | 搜索 | ✅ |

## 常见源框架对照

### XPTV 扩展（如 xptv-extensions）

| XPTV | uzVideo | 说明 |
|------|---------|------|
| `getConfig()` → TABS | `getClassList()` | 直接返回数组 |
| `getCards(ext)` | `getVideoList(args)` | `ext.id/page` → `args.url/page` |
| `getTracks(ext)` | `getVideoDetail(args)` | 集数列表 → `vod_play_url` |
| `getPlayinfo(ext)` | `getVideoPlayUrl(args)` | ext.url+ext.ep → m3u8 |
| `search(ext)` | `searchVideo(args)` | `ext.text` → `args.searchWord` |
| `$fetch.get()` | `req()` | uzVideo 内置网络函数 |
| `argsify/jsonify` | 原生 `JSON` | 去掉 XPTV 工具函数 |
| `ext` 对象 | `UZArgs` | 参数对象名变 |

### 苹果 CMS（MacCMS V10）

这类是 uzVideo 的原生格式，**无需移植**，直接写进 `video_sources_*.json`：

```json
{ "api": "https://xxx.com/api.php/provide/vod/", "name": "源名" }
```

### TVBox / 影视仓（带 spider/jar）

⚠️ uzVideo **不支持** spider 类源。需提取底层 CMS 接口（多为苹果 CMS），或参照 XPTV 路线重写为 HTML 刮削源。

## 移植步骤

1. **分析原始源** — 搞清接口框架（XPTV/TVBox/CMS/自定义）
2. **抓站点真实 HTML** — 确认 CSS 类名（类名是最大翻车点）
3. **写 uzVideo 扩展** — 按 7 接口映射
4. **本地测试** — uzVideo 导入 → 逐项验证
5. **入库** — `sources/` 放成品，`raw/` 备份原版，`docs/notes/` 记笔记

## 注意事项

- **封面图加密**：部分站点封面是 AES/混淆加密，uzVideo 无解密代理层，封面可能不显示（不影响播放）
- **集数传递**：uzVideo `vod_play_url` 是字符串，复杂信息用 `|` 拼接（如 `播放页URL|集数`）
- **反爬**：`req()` 需带正确 `headers`（UA / Referer），照搬原版 headers
- **类名推断**：详情页 CSS 类名易变，移植后需实测微调
