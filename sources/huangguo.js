// ignore
//@name:黄果短剧
//@version:1
//@webSite:https://huangguoai.com
//@remark:移植自 XPTV huangguo.js (huangguoai.com)，HTML刮削源
//@type:101
//@order: C
// ignore

// ============================================================
// 黄果短剧 uzVideo 扩展
// 移植自 XPTV xptv-extensions/js/huangguo.js
// 站点: huangguoai.com  (HTML 刮削，非苹果CMS接口)
//
// 接口映射:
//   XPTV getConfig()        → getClassList()    (一级分类 = TABS)
//   XPTV getCards(ext)      → getVideoList()    (分类视频列表)
//   XPTV getTracks(ext)     → getVideoDetail()  (详情+集数 → vod_play_url)
//   XPTV getPlayinfo(ext)   → getVideoPlayUrl() (提取 m3u8)
//   XPTV search(ext)        → searchVideo()
//
// 注意: 站点封面图可能为 AES-128-CBC 加密，uzVideo 无解密代理层，
//       封面可能无法显示（不影响播放）。
// ============================================================

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SITE = 'https://huangguoai.com'
const HEADERS = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: SITE + '/',
}

const appConfig = {
    _webSite: '',
    get webSite() {
        return this._webSite
    },
    set webSite(value) {
        this._webSite = value
    },
    _uzTag: '',
    get uzTag() {
        return this._uzTag
    },
    set uzTag(value) {
        this._uzTag = value
    },
}

// ---------- 一级分类 (对应 XPTV TABS) ----------
const TABS = [
    { name: '首页', id: 'home' },
    { name: 'AI成人短剧', id: 'ai-duanju' },
    { name: 'AI成人漫剧', id: 'ai-manju' },
    { name: 'AI换脸', id: 'ai-huanlian' },
    { name: 'AI魔改', id: 'ai-mogai' },
    { name: '排行榜', id: 'ranks/hot' },
]

// ---------- 工具函数 ----------
function fix(u) {
    if (!u) return ''
    if (u.indexOf('//') === 0) return 'https:' + u
    if (u.indexOf('/') === 0) return SITE + u
    return u
}

function imgSrc(u) {
    // 剔除 CDN 防盗链 auth_key 等查询参数，得到不过期的稳定直链
    u = fix(u || '')
    if (u.indexOf('http') === 0 && u.indexOf('?') !== -1) {
        u = u.replace(/\?.*/, '')
    }
    return u
}

function stripTags(s) {
    return String(s || '')
        .replace(/<[^>]*>/g, '')
        .trim()
}

async function fetchHtml(url, referer) {
    const headers = referer ? Object.assign({}, HEADERS, { Referer: referer }) : HEADERS
    const pro = await req(url, { headers: headers })
    const data = pro && pro.data
    return typeof data === 'string' ? data : data == null ? '' : JSON.stringify(data)
}

// ---------- 卡片解析 (首页/分类/搜索) ----------
function gridSlices(html, allGrids) {
    const re = /<div\s+class="[^"]*\bhg-card-grid\b[^"]*"[^>]*>/g
    const starts = []
    let m
    while ((m = re.exec(html)) !== null) starts.push(m.index + m[0].length)
    if (!starts.length) return []
    const slices = []
    const n = allGrids ? starts.length : Math.min(1, starts.length)
    for (let i = 0; i < n; i++) {
        const to = i + 1 < starts.length ? starts[i + 1] : html.length
        slices.push(html.slice(starts[i], to))
    }
    return slices
}

function cardBlocks(slice) {
    const re = /<div\s+class="[^"]*\bhg-drama-card\b[^"]*"[^>]*>/g
    const starts = []
    let m
    while ((m = re.exec(slice)) !== null) starts.push(m.index + m[0].length)
    const blocks = []
    for (let i = 0; i < starts.length; i++) {
        const to = i + 1 < starts.length ? starts[i + 1] : slice.length
        blocks.push(slice.slice(starts[i], to))
    }
    return blocks
}

function parseCardBlock(block) {
    const a = block.match(/href="[^"]*\/detail\/(\d+)\/[^"]*"/)
    if (!a) return null
    const vid = a[1]
    const imgM = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/)
    let title = ''
    const t = block.match(/hg-drama-card__title[^>]*>([\s\S]*?)<\/a>/)
    if (t) title = stripTags(t[1])
    if (!title) {
        const tt = block.match(/<a[^>]+href="[^"]*\/detail\/\d+\/"[^>]*>([\s\S]*?)<\/a>/)
        if (tt) title = stripTags(tt[1])
    }
    if (!title) return null
    const ep = block.match(/hg-drama-card__episode[^>]*>([\s\S]*?)<\/span>/)
    const score = block.match(/hg-drama-card__score[^>]*>([\s\S]*?)<\/span>/)
    const rem = ep ? ep[1].trim() : ''
    const sc = score ? score[1].trim() : ''
    let remarks = ''
    if (rem && sc) remarks = rem + ' · ' + sc
    else remarks = rem || sc
    return {
        vod_id: vid,
        vod_name: title,
        vod_pic: imgSrc(imgM ? imgM[1] : ''),
        vod_remarks: remarks,
    }
}

function parseGridCards(html, allGrids) {
    if (!html) return []
    const list = []
    const seen = {}
    for (const slice of gridSlices(html, allGrids)) {
        for (const block of cardBlocks(slice)) {
            try {
                const item = parseCardBlock(block)
                if (!item || seen[item.vod_id]) continue
                seen[item.vod_id] = true
                list.push(item)
            } catch (e) {}
        }
    }
    return list
}

// ---------- 排行榜解析 ----------
function parseRanks(html) {
    if (!html) return []
    const listM = html.match(/<div\s+class="[^"]*\bhg-rank-list\b[^"]*"[^>]*>/)
    const from = listM ? listM.index + listM[0].length : 0
    const slice = html.slice(from)
    const re = /<div\s+class="[^"]*\bhg-rank-item\b[^"]*"[^>]*>/g
    const starts = []
    let m
    while ((m = re.exec(slice)) !== null) starts.push(m.index + m[0].length)
    const list = []
    const seen = {}
    for (let i = 0; i < starts.length; i++) {
        const to = i + 1 < starts.length ? starts[i + 1] : slice.length
        const block = slice.slice(starts[i], to)
        try {
            const a = block.match(/href="[^"]*\/detail\/(\d+)\/[^"]*"/)
            if (!a || seen[a[1]]) continue
            seen[a[1]] = true
            const imgM = block.match(/data-src="([^"]+)"/) || block.match(/src="([^"]+)"/)
            let title = ''
            const t = block.match(/hg-rank-item__title[^>]*>([\s\S]*?)<\/h2>/)
            if (t) title = stripTags(t[1])
            if (!title) {
                const tt = block.match(/<a[^>]+href="[^"]*\/detail\/\d+\/"[^>]*>([\s\S]*?)<\/a>/)
                if (tt) title = stripTags(tt[1])
            }
            if (!title) continue
            const tags = block.match(/hg-rank-item__tags[^>]*>([\s\S]*?)<\/div>/)
            list.push({
                vod_id: a[1],
                vod_name: title,
                vod_pic: imgSrc(imgM ? imgM[1] : ''),
                vod_remarks: tags ? stripTags(tags[1]) : '',
            })
        } catch (e) {}
    }
    return list
}

// ============================================================
// uzVideo 扩展接口实现
// ============================================================

/**
 * 获取一级分类列表 (对应 XPTV getConfig → TABS)
 */
async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        var list = []
        for (var i = 0; i < TABS.length; i++) {
            var vc = new VideoClass()
            vc.type_id = TABS[i].id
            vc.type_name = TABS[i].name
            vc.hasSubclass = false
            list.push(vc)
        }
        backData.data = list
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取二级分类列表 (本源无二级分类，返回空)
 */
async function getSubclassList(args) {
    var backData = new RepVideoSubclassList()
    return JSON.stringify(backData)
}

/**
 * 获取分类视频列表 (对应 XPTV getCards)
 * args.url = 一级分类 type_id (home / ai-duanju / ranks/hot 等)
 * args.page = 页码
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        var id = String(args.url || 'home').replace(/^\//, '')
        var page = Math.max(1, parseInt(args.page) || 1)
        var html, cards
        if (id === 'home') {
            html = await fetchHtml(SITE + '/')
            cards = parseGridCards(html, true)
        } else {
            var url = SITE + '/' + id + '/' + (page > 1 ? page + '/' : '')
            html = await fetchHtml(url)
            if (id.indexOf('rank') !== -1) {
                cards = parseRanks(html)
            } else {
                cards = parseGridCards(html, false)
            }
        }
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            vd.vod_id = c.vod_id
            vd.vod_name = c.vod_name
            vd.vod_pic = c.vod_pic
            vd.vod_remarks = c.vod_remarks
            list.push(vd)
        }
        backData.data = list
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取二级分类视频列表 (本源无二级分类，同 getVideoList)
 */
async function getSubclassVideoList(args) {
    return await getVideoList(args)
}

/**
 * 获取视频详情 (对应 XPTV getTracks)
 * args.url = vod_id (视频ID)
 * 返回 vod_play_url 格式: 第1集$播放页URL|集数#第2集$播放页URL|集数#
 *   - $ 分割集名和URL
 *   - | 分割URL和集数 (传给 getVideoPlayUrl 解析)
 *   - # 分割各集
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        var id = String(args.url || '')
        if (!id) {
            backData.error = '缺少视频ID'
            return JSON.stringify(backData)
        }
        var html = await fetchHtml(SITE + '/detail/' + id + '/')
        var det = new VideoDetail()
        det.vod_id = id

        // 解析标题
        var titleM = html.match(/hg-web-detail__title[^>]*>([\s\S]*?)<\/h1>/) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)
        det.vod_name = titleM ? stripTags(titleM[1]) : id

        // 解析封面
        var imgM = html.match(/hg-web-detail__cover[^>]*>[\s\S]*?data-src="([^"]+)"/) || html.match(/hg-web-detail__cover[^>]*>[\s\S]*?src="([^"]+)"/) || html.match(/data-src="([^"]+)"/)
        det.vod_pic = imgSrc(imgM ? imgM[1] : '')

        // 解析简介
        var descM = html.match(/hg-web-detail__desc[^>]*>([\s\S]*?)<\/div>/)
        det.vod_content = descM ? stripTags(descM[1]) : ''

        // 解析集数列表
        var tracks = []
        var gridM = html.match(/<div\s+class="[^"]*\bhg-web-detail__ep-grid\b[^"]*"[^>]*>([\s\S]*?)<\/div>/)
        if (gridM) {
            var are = /<a\b[^>]*>[\s\S]*?<\/a>/g
            var m
            while ((m = are.exec(gridM[1])) !== null) {
                var tag = m[0]
                var hrefM = tag.match(/href="([^"]+)"/)
                if (!hrefM) continue
                var href = hrefM[1]
                var eidM = tag.match(/data-ep-id="([^"]*)"/)
                var eid = eidM ? eidM[1] : ''
                var name = eid ? '第' + eid + '集' : stripTags(tag)
                tracks.push({ name: name, url: fix(href) + '|' + eid })
            }
        }
        // 无集数列表时尝试播放按钮
        if (!tracks.length) {
            var playM = html.match(/<a\b[^>]*class="[^"]*\bhg-web-detail__play\b[^"]*"[^>]*href="([^"]+)"/)
            if (playM) {
                tracks.push({ name: '第1集', url: fix(playM[1]) + '|1' })
            }
        }

        // 构建 vod_play_url
        var vod_play_url = ''
        for (var i = 0; i < tracks.length; i++) {
            vod_play_url += tracks[i].name + '$' + tracks[i].url + '#'
        }
        det.vod_play_url = vod_play_url
        det.vod_play_from = '黄果短剧'

        backData.data = det
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取播放地址 (对应 XPTV getPlayinfo)
 * args.url = 播放页URL|集数  (由 vod_play_url 传入)
 * 抓取播放页 <script id="videoInitialData"> 内嵌 JSON，提取 epPlaySrcs[集数] 或 videoSrc
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        var raw = String(args.url || '')
        var parts = raw.split('|')
        var url = parts[0]
        var ep = String(parts[1] || '1')
        if (!url) {
            backData.error = '缺少播放URL'
            return JSON.stringify(backData)
        }
        var html = await fetchHtml(url, SITE)
        var play = ''
        var m = html.match(/id="videoInitialData"[^>]*>([\s\S]*?)<\/script>/)
        if (m) {
            try {
                var data = JSON.parse(m[1])
                var srcs = (data && data.epPlaySrcs) || {}
                play = srcs[ep] || (data && data.videoSrc) || ''
            } catch (e) {}
        }
        if (play) {
            play = play.replace(/\\u0026/g, '&')
            if (play.indexOf('http') !== 0) {
                var mm = play.match(/(https?:\/\/[^\s"']+)/)
                play = mm ? mm[1] : ''
            }
        }
        if (!play) {
            backData.error = '未找到播放地址'
            return JSON.stringify(backData)
        }
        backData.data = play
        backData.headers = {
            'User-Agent': UA,
            Referer: SITE + '/',
        }
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 搜索视频 (对应 XPTV search)
 * args.searchWord = 搜索关键词
 */
async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        var kw = String(args.searchWord || '').trim()
        if (!kw) return JSON.stringify(backData)
        var html = await fetchHtml(SITE + '/search/video/' + encodeURIComponent(kw) + '/')
        var cards = parseGridCards(html, false)
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            vd.vod_id = c.vod_id
            vd.vod_name = c.vod_name
            vd.vod_pic = c.vod_pic
            vd.vod_remarks = c.vod_remarks
            list.push(vd)
        }
        backData.data = list
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}
