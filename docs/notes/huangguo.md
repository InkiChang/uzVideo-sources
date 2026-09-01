# 移植笔记：黄果短剧 (huangguo.js)

## 基本信息
- **源站**: huangguoai.com
- **原始来源**: XPTV 扩展 (https://github.com/Yswag/xptv-extensions)
- **源类型**: HTML 刮削
- **移植目标**: uzVideo JS 扩展 (type 101)
- **状态**: ⚠️待测

## 原始接口 (XPTV)
- `getConfig()` → 返回 TABS 数组（首页/分类/排行榜）
- `getCards(ext)` → ext.id 决定抓哪个分类页，ext.page 翻页
- `getTracks(ext)` → ext.url 是播放页，返回集数列表
- `getPlayinfo(ext)` → ext.url+ext.ep，返回 m3u8
- `search(ext)` → ext.text 搜索词

## uzVideo 接口映射
- `getClassList()` → 返回一级分类（对应原 TABS）
- `getVideoList(args)` → args.url=分类页URL, args.page=页码
- `getSubclassList()` / `getSubclassVideoList()` → 短剧站点无二级分类，返回空
- `getVideoDetail(args)` → 抓播放页，解析集数，拼 `vod_play_url`
- `getVideoPlayUrl(args)` → 从 `vod_play_url` 解析播放页URL，抓 `videoInitialData` 取 m3u8
- `searchVideo(args)` → args.searchWord

## 关键改动
1. `$fetch.get()` → `req()`（uzVideo 内置网络函数）
2. `argsify/jsonify` → 原生 JSON.parse/JSON.stringify
3. **集数传递**: XPTV 用 `ext={url,ep}` 对象；uzVideo `vod_play_url` 只能存字符串，故用 `播放页URL|集数` 格式拼接
4. **播放地址提取**: `videoInitialData` JSON 解析逻辑完整保留——`epPlaySrcs[集数]` 优先，回退 `videoSrc`，做 `\u0026→&` 转义

## 已知限制
- **封面图**: 站点封面是 AES-128-CBC 加密（key=`f5d965df75336270`, iv=`97b60394abc2fbe1`），uzVideo 无解密代理层，**封面可能不显示**，不影响播放
- **详情页类名**: `getVideoDetail` 中的标题/封面/简介 CSS 类名按站点规律推断，**需实测后微调**

## 测试清单
- [ ] 导入成功无报错
- [ ] 分类列表显示 6 个 Tab
- [ ] 视频列表有数据
- [ ] 翻页正常
- [ ] 搜索可用
- [ ] 详情页有集数
- [ ] 点第1集能播放 m3u8
