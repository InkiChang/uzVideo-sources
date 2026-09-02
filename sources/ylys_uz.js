// ignore
//@name:永乐影视
//@version:1
//@webSite:https://www.ylys.tv
//@remark:移植自 XPTV ylys.js (ylys.tv)，MacCMS HTML刮削源
//@type:101
//@order: C
// ignore

// ============================================================
// 永乐影视 uzVideo 扩展
// 移植自 XPTV xptv-extensions/js/ylys.js
// 站点: ylys.tv  (MacCMS HTML 刮削)
//
// 接口映射:
//   XPTV getConfig()        → getClassList()    (一级分类 = TABS)
//   XPTV getCards(ext)      → getVideoList()    (分类视频列表)
//   XPTV getTracks(ext)     → getVideoDetail()  (详情+集数 → vod_play_url)
//   XPTV getPlayinfo(ext)   → getVideoPlayUrl() (提取播放地址)
//   XPTV search(ext)        → searchVideo()
// ============================================================

// ---------- XPTV → uzVideo POLYFILLS ----------
// uzVideo 全局: req(url,opts)→{data,headers,code}, cheerio, Crypto
function createCryptoJS() { return Crypto }
function createCheerio() { return cheerio }
const $fetch = {
    async get(url, opts) {
        opts = opts || {}
        const r = await req(url, opts)
        return { data: r.data, headers: r.headers || {}, error: r.error }
    }
}
function argsify(s) { return typeof s === 'string' ? JSON.parse(s) : (s || {}) }
function jsonify(obj) { return JSON.stringify(obj) }
const $utils = {
    toastInfo: (msg) => { try { console.log('[ylys]', msg) } catch(e) {} },
    openSafari: (url, ua) => { try { console.log('[ylys] openSafari:', url) } catch(e) {} },
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const CryptoJS = createCryptoJS()

// ============================================================
// 以下为原始 ylys.js 源码 (verbatim 保留，仅去掉 const cheerio = createCheerio() 冲突行)
// ============================================================

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const SITE = 'https://www.ylys.tv'

const FILTER = {
    1: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '动作片', v: '6' },
                { n: '喜剧片', v: '7' },
                { n: '爱情片', v: '8' },
                { n: '科幻片', v: '9' },
                { n: '奇幻片', v: '10' },
                { n: '恐怖片', v: '11' },
                { n: '剧情片', v: '12' },
                { n: '战争片', v: '20' },
                { n: '纪录片', v: '21' },
                { n: '动画片', v: '26' },
                { n: '悬疑片', v: '22' },
                { n: '冒险片', v: '23' },
                { n: '犯罪片', v: '24' },
                { n: '惊悚片', v: '45' },
                { n: '歌舞片', v: '46' },
                { n: '灾难片', v: '47' },
                { n: '网络片', v: '48' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '欧美', v: '欧美' },
                { n: '英国', v: '英国' },
                { n: '泰国', v: '泰国' },
                { n: '其它', v: '其它' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '全部', v: '' },
                { n: '添加时间', v: 'time_add' },
                { n: '更新时间', v: 'time_update' },
                { n: '人气排序', v: 'hits' },
                { n: '评分排序', v: 'score' },
            ],
        },
    ],
    2: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '国产剧', v: '13' },
                { n: '港台剧', v: '14' },
                { n: '日剧', v: '15' },
                { n: '韩剧', v: '33' },
                { n: '欧美剧', v: '16' },
                { n: '泰剧', v: '34' },
                { n: '新马剧', v: '35' },
                { n: '其他剧', v: '25' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '欧美', v: '欧美' },
                { n: '英国', v: '英国' },
                { n: '泰国', v: '泰国' },
                { n: '其它', v: '其它' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '全部', v: '' },
                { n: '添加时间', v: 'time_add' },
                { n: '更新时间', v: 'time_update' },
                { n: '人气排序', v: 'hits' },
                { n: '评分排序', v: 'score' },
            ],
        },
    ],
    3: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '内地综艺', v: '27' },
                { n: '港台综艺', v: '28' },
                { n: '日本综艺', v: '29' },
                { n: '韩国综艺', v: '36' },
                { n: '欧美综艺', v: '30' },
                { n: '新马泰综艺', v: '37' },
                { n: '其他综艺', v: '38' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '欧美', v: '欧美' },
                { n: '英国', v: '英国' },
                { n: '泰国', v: '泰国' },
                { n: '其它', v: '其它' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '全部', v: '' },
                { n: '添加时间', v: 'time_add' },
                { n: '更新时间', v: 'time_update' },
                { n: '人气排序', v: 'hits' },
                { n: '评分排序', v: 'score' },
            ],
        },
    ],
    4: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '' },
                { n: '国产动漫', v: '31' },
                { n: '日本动漫', v: '32' },
                { n: '韩国动漫', v: '39' },
                { n: '港台动漫', v: '40' },
                { n: '新马泰动漫', v: '41' },
                { n: '欧美动漫', v: '42' },
                { n: '其他动漫', v: '43' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '欧美', v: '欧美' },
                { n: '英国', v: '英国' },
                { n: '泰国', v: '泰国' },
                { n: '其它', v: '其它' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '全部', v: '' },
                { n: '添加时间', v: 'time_add' },
                { n: '更新时间', v: 'time_update' },
                { n: '人气排序', v: 'hits' },
                { n: '评分排序', v: 'score' },
            ],
        },
    ],
}

// === Helper ===
function fixUrl(url) {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('//')) return 'https:' + url
    return SITE + (url.startsWith('/') ? '' : '/') + url
}

// Build MacCMS vodshow URL
// 12 segments: [tid, area, sort, ?, lang, letter, ?, ?, page, ?, ?, year]
function buildShowUrl(tid, filters, page) {
    var area = (filters && filters.area) || ''
    var sort = (filters && filters.sort) || ''
    var cls = (filters && filters.type) || ''
    var p = page > 1 ? String(page) : ''

    var seg = ['', '', '', '', '', '', '', '', '', '', '', '']
    seg[0] = cls || tid
    seg[1] = area
    seg[2] = sort
    seg[8] = p

    return SITE + '/vodshow/' + seg.join('-') + '/'
}

// === Interfaces ===

async function getLocalInfo() {
    return jsonify({ ver: 1, name: '永乐影视', api: 'csp_ylys', type: 3 })
}

async function getConfig() {
    return jsonify({
        ver: 1,
        title: '永乐影视',
        site: SITE,
        tabs: [
            { name: '电影', ext: { id: '1' } },
            { name: '剧集', ext: { id: '2' } },
            { name: '综艺', ext: { id: '3' } },
            { name: '动漫', ext: { id: '4' } },
            { name: '热播', ext: { id: 'hot' } },
            { name: '更新', ext: { id: 'new' } },
        ],
    })
}

async function getCards(ext) {
    ext = argsify(ext)
    var id = ext.id || '1'
    var page = ext.page || 1
    var filters = ext.filters || {}
    var list = []
    var url

    try {
        if (id === 'hot') {
            url = SITE + '/label/hot/'
        } else if (id === 'new') {
            url = SITE + '/label/new/'
        } else {
            url = buildShowUrl(id, filters, page)
        }

        var resp = await $fetch.get(url, { headers: { 'User-Agent': UA, Referer: SITE + '/' } })
        var html = resp.data || ''
        if (html.length < 500) return jsonify({ list: list })

        var $ = createCheerio().load(html)
        var seen = {}

        // Poster items: vodshow / label pages
        $('a.module-poster-item, a.module-card-item-poster').each(function (i, el) {
            var $el = $(el)
            var href = $el.attr('href') || ''
            var m = href.match(/\/voddetail\/(\d+)/)
            if (!m) return
            var vid = m[1]
            if (seen[vid]) return
            seen[vid] = true

            var title = $el.attr('title') || $el.find('img').first().attr('alt') || ''
            var pic = $el.find('img').first().attr('data-original') || $el.find('img').first().attr('src') || ''
            var note = $el.find('.module-item-note').first().text().trim() || ''

            list.push({
                vod_id: vid,
                vod_name: title.trim(),
                vod_pic: fixUrl(pic),
                vod_remarks: note,
                ext: { id: vid },
            })
        })
    } catch (e) {
        console.error('getCards error:', e)
    }

    return jsonify({ list: list, filter: FILTER[id] || [] })
}

async function getTracks(ext) {
    ext = argsify(ext)
    var id = ext.id || ''
    if (!id) return jsonify({ list: [] })

    var list = []

    try {
        var resp = await $fetch.get(SITE + '/voddetail/' + id + '/', {
            headers: { 'User-Agent': UA, Referer: SITE + '/' },
        })
        var html = resp.data || ''
        var $ = createCheerio().load(html)

        // Extract source names from tab items
        var tabNames = []
        $('#y-playList .module-tab-item, .module-tab-item').each(function (i, el) {
            var name = $(el).attr('data-dropdown-value') || $(el).find('span').first().text().trim()
            if (name && tabNames.indexOf(name) === -1) tabNames.push(name)
        })

        // Parse play groups
        var groups = []
        $('.his-tab-list, .module-play-list').each(function (idx, box) {
            var sourceName = tabNames[idx] || '线路' + (idx + 1)
            var tracks = []
            $(box)
                .find('a.module-play-list-link')
                .each(function (j, a) {
                    var href = $(a).attr('href') || ''
                    var epName = $(a).find('span').first().text().trim() || $(a).text().trim()
                    if (!epName) return
                    tracks.push({
                        name: epName,
                        ext: { url: fixUrl(href) },
                    })
                })
            if (tracks.length) {
                groups.push({ title: sourceName, tracks: tracks })
            }
        })

        // Fallback: parse all play links
        if (!groups.length) {
            var sources = {}
            $('a[href*="/play/"]').each(function (i, el) {
                var href = $(el).attr('href') || ''
                var m = href.match(/\/play\/(\d+)-(\d+)-(\d+)/)
                if (!m) return
                var sid = m[2]
                var nid = parseInt(m[3])
                if (!sources[sid]) sources[sid] = { min: 999, max: 0 }
                if (nid < sources[sid].min) sources[sid].min = nid
                if (nid > sources[sid].max) sources[sid].max = nid
            })
            var sids = Object.keys(sources).sort(function (a, b) {
                return parseInt(a) - parseInt(b)
            })
            for (var si = 0; si < sids.length; si++) {
                var s = sids[si]
                var tracks = []
                for (var ep = sources[s].min; ep <= sources[s].max; ep++) {
                    tracks.push({
                        name: '第' + (ep < 10 ? '0' : '') + ep + '集',
                        ext: { url: SITE + '/play/' + id + '-' + s + '-' + ep + '/' },
                    })
                }
                groups.push({ title: '线路' + s, tracks: tracks })
            }
        }

        list = groups
    } catch (e) {
        console.error('getTracks error:', e)
    }

    return jsonify({ list: list })
}

async function getPlayinfo(ext) {
    try {
        ext = argsify(ext)
        var playUrl = ext.url || ''
        if (!playUrl) return jsonify({ urls: [] })

        var resp = await $fetch.get(playUrl, {
            headers: { 'User-Agent': UA, Referer: SITE + '/' },
        })
        var html = resp.data || ''

        // Extract player_aaaa JSON
        var url = ''
        var idx = html.indexOf('player_aaaa')
        if (idx >= 0) {
            var start = html.indexOf('{', idx)
            if (start >= 0) {
                var depth = 0,
                    end = start
                for (var i = start; i < html.length; i++) {
                    if (html[i] === '{') depth++
                    else if (html[i] === '}') {
                        depth--
                        if (depth === 0) {
                            end = i
                            break
                        }
                    }
                }
                try {
                    var player = JSON.parse(html.slice(start, end + 1))
                    if (player.url) url = player.url
                } catch (e) {}
            }
        }

        // Fallback: iframe
        if (!url) {
            var iframeM = html.match(/<iframe[^>]+src="([^"]+)"/)
            if (iframeM) {
                url = iframeM[1]
                if (url.startsWith('//')) url = 'https:' + url
            }
        }

        if (!url) return jsonify({ urls: [] })

        return jsonify({
            urls: [url],
            headers: [{ 'User-Agent': UA, Referer: SITE + '/' }],
        })
    } catch (e) {
        console.error('getPlayinfo error:', e)
        return jsonify({ urls: [] })
    }
}

async function search(ext) {
    ext = argsify(ext)
    var text = ext.text || ext.wd || ''
    var page = ext.page || 1
    var list = []

    if (!text.trim()) return jsonify({ list: list })

    try {
        var url
        if (page > 1) {
            url = SITE + '/vodsearch/' + encodeURIComponent(text) + '----------' + page + '---/'
        } else {
            url = SITE + '/vodsearch/-------------/?wd=' + encodeURIComponent(text)
        }

        var resp = await $fetch.get(url, { headers: { 'User-Agent': UA, Referer: SITE + '/' } })
        var html = resp.data || ''
        if (html.length < 500) return jsonify({ list: list })

        var $ = createCheerio().load(html)
        var seen = {}

        $('a.module-card-item-poster').each(function (i, el) {
            var $el = $(el)
            var href = $el.attr('href') || ''
            var m = href.match(/\/voddetail\/(\d+)/)
            if (!m) return
            var vid = m[1]
            if (seen[vid]) return
            seen[vid] = true

            var title = $el.find('img').first().attr('alt') || $el.attr('title') || ''
            var pic = $el.find('img').first().attr('data-original') || $el.find('img').first().attr('src') || ''
            var note = $el.find('.module-item-note').first().text().trim() || ''

            list.push({
                vod_id: vid,
                vod_name: title.trim(),
                vod_pic: fixUrl(pic),
                vod_remarks: note,
                ext: { id: vid },
            })
        })
    } catch (e) {
        console.error('search error:', e)
    }

    return jsonify({ list: list })
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
        var config = JSON.parse(await getConfig())
        var list = []
        if (config && config.tabs) {
            for (var i = 0; i < config.tabs.length; i++) {
                var tab = config.tabs[i]
                var vc = new VideoClass()
                vc.type_id = String(tab.ext && tab.ext.id ? tab.ext.id : i)
                vc.type_name = tab.name
                vc.hasSubclass = false
                list.push(vc)
            }
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
 * args.url = 一级分类 type_id (如 '1'电影/'2'剧集/'3'综艺/'4'动漫/'hot'/'new')
 * args.page = 页码
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        var id = String(args.url || '1')
        var page = Math.max(1, parseInt(args.page) || 1)
        var ext = jsonify({ id: id, page: page })
        var result = JSON.parse(await getCards(ext))
        var cards = result.list || []
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            // vod_id 存视频ID(数字)，供 getVideoDetail → getTracks 使用
            vd.vod_id = (c.ext && c.ext.id) ? c.ext.id : c.vod_id
            vd.vod_name = c.vod_name || ''
            vd.vod_pic = c.vod_pic || ''
            vd.vod_remarks = c.vod_remarks || ''
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
 * args.url = 视频ID (vod_id，数字)
 * 返回 vod_play_url 格式: 集1$播放页URL1#集2$播放页URL2#$$$集1$播放页URL1#
 *        vod_play_from: 线路1$$$线路2
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        var id = String(args.url || '')
        if (!id) {
            backData.error = '缺少视频ID'
            return JSON.stringify(backData)
        }
        var ext = jsonify({ id: id })
        var result = JSON.parse(await getTracks(ext))
        var lists = result.list || []

        // 构建多线路 vod_play_url
        // 格式: 集1$URL1#集2$URL2#$$$集1$URL1#集2$URL2#
        // uzVideo 用 $$$ 分隔多线路
        var lines = []
        var froms = []
        for (var i = 0; i < lists.length; i++) {
            var line = lists[i]
            var lineName = line.title || ('线路' + (i + 1))
            var tracks = line.tracks || []
            var eps = []
            for (var j = 0; j < tracks.length; j++) {
                var t = tracks[j]
                var epName = t.name || ('第' + (j + 1) + '集')
                var epUrl = (t.ext && t.ext.url) ? t.ext.url : ''
                if (epUrl) {
                    eps.push(epName + '$' + epUrl)
                }
            }
            if (eps.length > 0) {
                lines.push(eps.join('#'))
                froms.push(lineName)
            }
        }

        var det = new VideoDetail()
        det.vod_id = id
        det.vod_play_url = lines.join('$$$')
        det.vod_play_from = froms.join('$$$')

        backData.data = det
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取播放地址 (对应 XPTV getPlayinfo)
 * args.url = 播放页URL (由 vod_play_url 传入)
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        var url = String(args.url || '')
        if (!url) {
            backData.error = '缺少播放URL'
            return JSON.stringify(backData)
        }
        var ext = jsonify({ url: url })
        var result = JSON.parse(await getPlayinfo(ext))
        var urls = result.urls || []
        if (urls.length > 0) {
            backData.data = urls[0]
            backData.headers = {
                'User-Agent': UA,
                Referer: SITE + '/',
            }
        } else {
            backData.error = '未找到播放地址'
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
        var page = Math.max(1, parseInt(args.page) || 1)
        var ext = jsonify({ text: kw, page: page })
        var result = JSON.parse(await search(ext))
        var cards = result.list || []
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            vd.vod_id = (c.ext && c.ext.id) ? c.ext.id : c.vod_id
            vd.vod_name = c.vod_name || ''
            vd.vod_pic = c.vod_pic || ''
            vd.vod_remarks = c.vod_remarks || ''
            list.push(vd)
        }
        backData.data = list
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}
