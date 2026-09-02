// ignore
//@name:燒火電影
//@version:1
//@webSite:https://shdy2.com
//@remark:移植自 XPTV saohuo.js (shdy2.com)，HTML刮削源
//@type:101
//@order: C
// ignore

// ============================================================
// 燒火電影 uzVideo 扩展
// 移植自 XPTV xptv-extensions/js/saohuo.js
// 站点: shdy2.com  (HTML 刮削，非苹果CMS接口)
//
// 接口映射:
//   XPTV getConfig()        → getClassList()    (一级分类 = TABS)
//   XPTV getCards(ext)      → getVideoList()    (分类视频列表)
//   XPTV getTracks(ext)     → getVideoDetail()  (详情+集数 → vod_play_url)
//   XPTV getPlayinfo(ext)   → getVideoPlayUrl() (提取播放地址)
//   XPTV search(ext)        → searchVideo()
// ============================================================

// ---------- XPTV → uzVideo POLYFILLS ----------
function createCheerio() { return cheerio }
function createCryptoJS() { return Crypto }
// ⚠️ shdy2.com 由 Cloudflare 按请求头特征拦截: 仅 UA 的裸请求被返 522(16字节)
// 实测(node, 2026-09): 携带完整 Chrome 浏览器头 → 200 + 真实 HTML
// 因此 polyfill 层强制覆盖为实测可过的完整浏览器头(不受原 opts.headers 影响)
const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Sec-Ch-Ua': '"Chromium";v="128", "Google Chrome";v="128"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
}
const $fetch = {
    async get(url, opts) {
        opts = opts || {}
        opts.headers = Object.assign({}, opts.headers || {}, BROWSER_HEADERS)
        const r = await req(url, opts)
        return { data: r.data, headers: r.headers || {}, error: r.error }
    },
    async post(url, body, opts) {
        opts = opts || {}
        opts.method = 'POST'
        opts.headers = Object.assign({}, opts.headers || {}, BROWSER_HEADERS)
        if (body) {
            opts.body = typeof body === 'string' ? body : JSON.stringify(body)
        }
        const r = await req(url, opts)
        return { data: r.data, headers: r.headers || {}, error: r.error }
    }
}
function argsify(s) { return typeof s === 'string' ? JSON.parse(s) : (s || {}) }
function jsonify(obj) { return JSON.stringify(obj) }
const $utils = {
    toastInfo: (msg) => { try { console.log('[saohuo]', msg) } catch(e) {} },
    openSafari: (url, ua) => { try { console.log('[saohuo] openSafari:', url) } catch(e) {} },
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const CryptoJS = createCryptoJS()


const headers = {
    'User-Agent':
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
}

let appConfig = {
    ver: 20260902,
    title: '燒火電影',
    site: 'https://shdy2.com',
    tabs: [
        {
            name: '電影',
            ext: {
                id: 1,
            },
        },
        {
            name: '電視劇',
            ext: {
                id: 2,
            },
        },
        {
            name: '動漫',
            ext: {
                id: 4,
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

function toHref(href) {
    if (!href) return href
    if (/^https?:\/\//.test(href)) return href
    return `${appConfig.site}${href.startsWith('/') ? '' : '/'}${href}`
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext
    if (id == null) return jsonify({ list: cards })
    const url = `${appConfig.site}/list/${id}-${page}.html`

    const { data } = await $fetch.get(url, {
        headers: headers,
    })
    if (!data) return jsonify({ list: cards })

    const $ = cheerio.load(data)
    $('ul.v_list div.v_img').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('a').attr('title')
        const cover = $(element).find('img').attr('data-original') || $(element).find('img').attr('src')
        const subTitle = $(element).find('.v_note').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: toHref(href),
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let list = []
    let url = ext.url
    if (!url) return jsonify({ list })

    const { data } = await $fetch.get(url, {
        headers: headers,
    })
    if (!data) return jsonify({ list })

    const $ = cheerio.load(data)

    let play_from = []
    $('ul.from_list li').each((_, e) => {
        play_from.push($(e).text().trim())
    })

    $('#play_link li').each((i, e) => {
        const from = play_from[i] || play_from[0] || '線路'
        const eps = $(e).find('a')
        let temp = []
        eps.each((_, e) => {
            const name = $(e).text()
            const href = $(e).attr('href')
            temp.push({
                name: `${name}`,
                pan: '',
                ext: {
                    url: toHref(href),
                },
            })
        })
        const num = (s) => {
            const m = String(s).match(/\d+/)
            return m ? parseInt(m[0], 10) : 0
        }
        temp.sort((a, b) => num(a.name) - num(b.name))
        list.push({
            title: from,
            tracks: temp,
        })
    })

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    try {
        const url = ext.url
        if (!url) return jsonify({ urls: [] })

        const { data } = await $fetch.get(url, {
            headers: headers,
        })
        if (!data) return jsonify({ urls: [] })

        const $ = cheerio.load(data)
        let iframeSrc = $('iframe').attr('src')
        if (!iframeSrc) return jsonify({ urls: [] })
        iframeSrc = toHref(iframeSrc)

        const cipher = (iframeSrc.match(/[?&]url=([0-9A-Fa-f]+)/) || [])[1]
        if (!cipher) return jsonify({ urls: [] })

        const apiOrigin = (iframeSrc.match(/^(https?:\/\/[^\/]+)/) || [])[1]
        if (!apiOrigin) return jsonify({ urls: [] })

        const pResp = await $fetch.get(iframeSrc, {
            headers: headers,
        })
        if (!pResp || !pResp.data) return jsonify({ urls: [] })

        const $p = cheerio.load(pResp.data)
        const script = $p('script')
            .map((_, e) => $(e).text())
            .get()
            .join('\n')
        const bm = script.match(/__HHJX_BOOTSTRAP__\s*=\s*(\{[^;]*\})/)
        if (!bm) return jsonify({ urls: [] })
        let boot = {}
        try {
            boot = JSON.parse(bm[1])
        } catch (e) {
            boot = {}
        }

        const bootUrl = boot.url || cipher
        const bootT = boot.t
        const bootKey = boot.key
        if (!bootKey || bootT == null) return jsonify({ urls: [] })

        const parseBody = JSON.stringify({
            url: bootUrl,
            t: bootT,
            key: bootKey,
            client_fallback: false,
        })

        const presp = await $fetch.post(apiOrigin + '/api/parse', parseBody, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': headers['User-Agent'],
                Referer: iframeSrc,
            },
        })
        let res = {}
        try {
            res = JSON.parse(presp.data)
        } catch (e) {
            res = {}
        }

        let playUrl = res.url
        if (!playUrl) return jsonify({ urls: [] })
        if (playUrl.startsWith('http://')) playUrl = playUrl.replace('http://', 'https://')

        return jsonify({
            urls: [playUrl],
            headers: [{ 'User-Agent': headers['User-Agent'], Referer: iframeSrc }],
        })
    } catch (e) {}

    return jsonify({ urls: [] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []
    try {
        const keyword = (ext.text != null ? ext.text : ext.wd) || ''
        if (!keyword) return jsonify({ list: cards })

        const text = encodeURIComponent(keyword)
        const url = `${appConfig.site}/s----------.html?wd=${text}`

        const { data } = await $fetch.get(url, {
            headers: headers,
        })
        if (!data) return jsonify({ list: cards })

        const $ = cheerio.load(data)
        $('ul.v_list div.v_img').each((_, element) => {
            const href = $(element).find('a').attr('href')
            const title = $(element).find('a').attr('title')
            const cover = $(element).find('img').attr('data-original') || $(element).find('img').attr('src')
            const subTitle = $(element).find('.v_note').text()
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: toHref(href),
                },
            })
        })
    } catch (e) {}

    return jsonify({ list: cards })
}


// ============================================================
// uzVideo 扩展接口实现
// ============================================================

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

async function getSubclassList(args) {
    var backData = new RepVideoSubclassList()
    return JSON.stringify(backData)
}

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
            vd.vod_id = (c.ext && c.ext.url) ? c.ext.url : c.vod_id
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

async function getSubclassVideoList(args) {
    return await getVideoList(args)
}

async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        var url = String(args.url || '')
        if (!url) {
            backData.error = '缺少详情URL'
            return JSON.stringify(backData)
        }
        var ext = jsonify({ url: url })
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
            if (result.headers && result.headers[0]) {
                backData.headers = result.headers[0]
            }
        } else {
            backData.error = '未找到播放地址'
        }
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        var kw = String(args.searchWord || '').trim()
        if (!kw) return JSON.stringify(backData)
        var ext = jsonify({ text: kw })
        var result = JSON.parse(await search(ext))
        var cards = result.list || []
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            vd.vod_id = (c.ext && c.ext.url) ? c.ext.url : c.vod_id
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
