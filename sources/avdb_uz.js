// ignore
//@name:avdb
//@version:1
//@webSite:https://avdbapi.com
//@remark:移植自 XPTV avdb.js (avdbapi.com)，MacCMS JSON API源
//@type:101
//@order: C
// ignore

// ============================================================
// avdb uzVideo 扩展
// 移植自 XPTV xptv-extensions/js/avdb.js
// 站点: avdbapi.com  (MacCMS JSON API，非HTML刮削)
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
// 映射 XPTV API 到 uzVideo 全局
function createCryptoJS() { return Crypto }
const $fetch = {
    async get(url, opts) {
        opts = opts || {}
        const r = await req(url, opts)
        return { data: r.data, headers: r.headers || {}, error: r.error }
    }
}
function argsify(s) { return typeof s === 'string' ? JSON.parse(s) : (s || {}) }
function jsonify(obj) { return JSON.stringify(obj) }
function $print(...args) { try { console.log('[avdb]', ...args) } catch(e) {} }
const $utils = {
    toastInfo: (msg) => { try { console.log('[avdb]', msg) } catch(e) {} },
    openSafari: (url, ua) => { try { console.log('[avdb] openSafari:', url) } catch(e) {} },
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
const CryptoJS = createCryptoJS()

// ============================================================
// 以下为原始 avdb.js 源码 (verbatim 保留)
// ============================================================

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/604.1.14 (KHTML, like Gecko)'

let appConfig = {
    ver: 20260902,
    title: 'avdb',
    site: 'https://avdbapi.com/api.php/provide/vod',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(appConfig)
}

async function getTabs() {
    let tabs = []
    let url = appConfig.site

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    argsify(data).class.forEach((e) => {
        tabs.push({
            id: e.type_id,
            name: e.type_name,
            ext: {
                id: e.type_id,
            },
            ui: 1,
        })
    })

    return tabs
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext

    try {
        const url = appConfig.site + `?t=${id}&ac=detail&pg=${page}`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        argsify(data).list.forEach((e) => {
            cards.push({
                vod_id: `${e.id}`,
                vod_name: e.name,
                vod_pic: e.poster_url,
                vod_remarks: e.tag,
                vod_pubdate: e.created_at,
                vod_duration: e.time,
                ext: {
                    id: `${e.id}`,
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let id = ext.id
    let url = appConfig.site + `?ac=detail&ids=${id}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let vod_play_url = argsify(data).list[0].episodes.server_data.Full.link_embed
    tracks.push({
        name: argsify(data).list[0].episodes.server_name,
        pan: '',
        ext: {
            url: vod_play_url,
        },
    })

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: `https://avdbapi.com/`,
        },
    })

    // upload18 player embeds the m3u8 URL inside window.PLAYER_CONFIG as
    // {"theme":...,"m3u8":"https:\/\/helvid.com\/m\/...","alternate720":...}
    // Note the key is written as "m3u8":"..." (closing quote before the colon).
    const configMatch = data.match(/"m3u8"\s*:\s*"([^"]+)"/)
    if (!configMatch) {
        throw new Error('No m3u8 URL found in page')
    }

    // The JSON value is HTML-escaped: \/ for / and \uXXXX for & etc.
    let m3u8Path = configMatch[1]
        .replace(/\\\//g, '/')
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))

    return jsonify({ urls: [m3u8Path], headers: [{ 'User-Agent': UA, Referer: `${url}/` }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}?ac=detail&wd=${text}&pg=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    argsify(data).list.forEach((e) => {
        cards.push({
            vod_id: `${e.id}`,
            vod_name: e.name,
            vod_pic: e.poster_url,
            vod_remarks: e.tag,
            vod_pubdate: e.created_at,
            vod_duration: e.time,
            ext: {
                id: `${e.id}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
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
 * args.url = 一级分类 type_id (tab.ext.id)
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
 * args.url = 视频ID (vod_id)
 * 返回 vod_play_url 格式: 线路名$集1$播放页URL1#集2$播放页URL2#
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        var url = String(args.url || '')
        if (!url) {
            backData.error = '缺少详情URL'
            return JSON.stringify(backData)
        }
        var ext = jsonify({ id: url })
        var result = JSON.parse(await getTracks(ext))
        var lists = result.list || []

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
        det.vod_id = url
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
                Referer: 'https://avdbapi.com/',
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
