// ignore
//@name:七色番
//@version:1
//@webSite:https://www.7sefun.top
//@remark:移植自 XPTV 7sefun.js (7sefun.top)，HTML刮削源
//@type:101
//@order: C
// ignore

// ============================================================
// 七色番 uzVideo 扩展
// 移植自 XPTV xptv-extensions/js/7sefun.js
// 站点: 7sefun.top  (HTML 刮削，非苹果CMS接口)
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
const $utils = {
    toastInfo: (msg) => { try { console.log('[7sefun]', msg) } catch(e) {} },
    openSafari: (url, ua) => { try { console.log('[7sefun] openSafari:', url) } catch(e) {} },
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

const CryptoJS = createCryptoJS()

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'

let appConfig = {
    ver: 20260314,
    title: '七色番',
    site: 'https://www.7sefun.top',
    tabs: [
        {
            name: 'TV番劇',
            ext: {
                id: '1',
            },
        },
        {
            name: '国漫',
            ext: {
                id: '5',
            },
        },
        {
            name: '剧场电影',
            ext: {
                id: '2',
            },
        },
        {
            name: '特摄剧',
            ext: {
                id: '4',
            },
        },
    ],
}

const playerConfig = {
    '2bdm': {
        show: '七色R线',
        des: '',
        ps: '0',
        parse: '',
    },
    lmm: {
        show: '七色A线',
        des: '',
        ps: '1',
        parse: 'https://dp.no3acg.com/player/ec.php?code=qw&if=1&from=lmm&url=',
    },
    H265: {
        show: '高清H265',
        des: '',
        ps: '0',
        parse: '',
    },
    CYDD1: {
        show: '七色C线',
        des: '',
        ps: '0',
        parse: '',
    },
    ndx: {
        show: '七色B线',
        des: '',
        ps: '0',
        parse: '',
    },
    funzy: {
        show: '日漫高清',
        des: '',
        ps: '0',
        parse: 'https://nplayer.7sefun.top/player/index.php?code=qw&url=',
    },
    funzycn: {
        show: '国语高清',
        des: '',
        ps: '0',
        parse: '',
    },
    funzy4K: {
        show: '4K超清',
        des: '4K超清',
        ps: '0',
        parse: '',
    },
    tsfun: {
        show: '特摄',
        des: '',
        ps: '0',
        parse: '',
    },
    sssfun: {
        show: '日漫流畅版',
        des: '',
        ps: '0',
        parse: 'https://www.7sefun.com/jx.php?url=',
    },
    sssfuncn: {
        show: '国语流畅',
        des: '',
        ps: '0',
        parse: '',
    },
    gmfun: {
        show: '国漫',
        des: '',
        ps: '0',
        parse: '',
    },
    gmfun4k: {
        show: '国漫4K',
        des: '',
        ps: '0',
        parse: '',
    },
    funzyjp: {
        show: '日配版',
        des: '',
        ps: '0',
        parse: '',
    },
    mmfun: {
        show: '美漫',
        des: '',
        ps: '0',
        parse: '',
    },
    '7sefun': {
        show: '七色番',
        des: '',
        ps: '0',
        parse: 'https://play.7sefun.com/?url=',
    },
    videojs: {
        show: 'videojs-H5播放器',
        des: 'videojs.com',
        ps: '0',
        parse: '',
    },
    iva: {
        show: 'iva-H5播放器',
        des: 'videojj.com',
        ps: '0',
        parse: '',
    },
    iframe: {
        show: 'iframe外链数据',
        des: 'iframe外链数据',
        ps: '0',
        parse: '',
    },
    link: {
        show: '外链数据',
        des: '外部网站播放链接',
        ps: '0',
        parse: '',
    },
    swf: {
        show: 'Flash文件',
        des: 'swf',
        ps: '0',
        parse: '',
    },
    flv: {
        show: 'Flv文件',
        des: 'flv',
        ps: '0',
        parse: '',
    },
    dplayer: {
        show: '七色',
        des: 'dplayer.js.org',
        ps: '0',
        parse: '',
    },
    MIPFS: {
        show: 'M线',
        des: '',
        ps: '0',
        parse: '',
    },
    bilibili: {
        show: 'bilibili',
        des: 'bilibili',
        ps: '1',
        parse: 'https://jx.jsonplayer.com/player/?url=',
    },
    lzm3u8: {
        show: '备用有广告版',
        des: '',
        ps: '0',
        parse: 'https://mf.qiau.cn/json.php?url=',
    },
    qiyi: {
        show: '奇艺视频',
        des: '',
        ps: '1',
        parse: 'https://jx.jsonplayer.com/player/?url=',
    },
    qq: {
        show: '腾讯视频',
        des: '',
        ps: '1',
        parse: 'https://jx.jsonplayer.com/player/?url=',
    },
    youku: {
        show: '优酷视频',
        des: '',
        ps: '1',
        parse: 'https://jx.jsonplayer.com/player/?url=',
    },
}

async function getConfig() {
    $utils.toastInfo('七色A線暫時失效，B線正常。')
    let config = appConfig
    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext
    const f = ext.filters || {}

    // 站點篩選 URL 為 12 欄自訂模板：
    //   vodshow/{id}-{area}-{order}-{type}-{lang}-{letter}-{}-{}-{page}-{}-{}-{year}.html
    const enc = (s) => (s ? encodeURIComponent(s) : '')
    const url = `${appConfig.site}/vodshow/${[
        String(id),
        enc(f.area),
        enc(f.order || 'time'),
        enc(f.type),
        enc(f.lang),
        enc(f.letter),
        '',
        '',
        String(page),
        '',
        '',
        enc(f.year),
    ].join('-')}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('div.video').each((_, element) => {
        const href = $(element).find('a.video-wrapper').attr('href')
        const title = $(element).find('.video-name').text()
        const cover = $(element).find('img.videoimg').attr('src')
        const subTitle = $(element).find('.video-view').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
        filter: parseFilter($),
    })
}

function parseFilter($) {
    const groups = []
    const keyMap = [
        ['类型', 'type'],
        ['地区', 'area'],
        ['语言', 'lang'],
        ['年代', 'year'],
        ['字母', 'letter'],
    ]
    $('.filter-focus .filter-list').each((_, el) => {
        const label = $(el).find('b').first().text()
        let key = null
        for (const [kw, k] of keyMap) {
            if (label.includes(kw)) {
                key = k
                break
            }
        }
        if (!key) return
        const value = []
        $(el)
            .find('ul li a')
            .each((_, a) => {
                const text = $(a).text().trim()
                value.push({ n: text || '全部', v: text === '全部' ? '' : text })
            })
        groups.push({ key, name: label.replace(/[：:]/g, '').trim(), value })
    })
    // 排序（order）選項位於 .view-filter，不在 .filter-list 內：time / hits / score
    $('.view-filter').each((_, el) => {
        const label = $(el).find('b').first().text()
        if (!label.includes('排序')) return
        const value = []
        $(el)
            .find('a.order')
            .each((_, a) => {
                const text = $(a).text().trim()
                const body = ($(a).attr('href') || '').replace('/vodshow/', '').replace(/\.html$/, '')
                const tok = body.split('-')[2]
                value.push({ n: text, v: tok || '' })
            })
        groups.push({ key: 'order', name: label.replace(/[：:]/g, '').trim(), value })
    })
    return groups
}

async function getTracks(ext) {
    ext = argsify(ext)
    let lists = []
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    try {
        $('.chat-stream .chat-header.anim').each((_, e) => {
            const name = $(e).find('.chat-stream-bfq').text()
            lists.push({
                title: name,
                tracks: [],
            })
        })
        $('.vod-play-list-container').each((i, e) => {
            $(e)
                .find('span')
                .each((_, el) => {
                    const name = $(el).find('a').text()
                    const href = $(el).find('a').attr('href')
                    lists[i].tracks.push({
                        name,
                        pan: '',
                        ext: {
                            url: appConfig.site + href,
                        },
                    })
                })
        })
    } catch (error) {
        console.log(error)
    }

    return jsonify({
        list: lists,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    const config = JSON.parse($('script:contains(player_aaaa)').html().replace('var player_aaaa=', ''))

    if (config.encrypt == 2) {
        const videoUrl = unescape(base64Decode(config.url))
        const from = config.from
        const id = config.link.split('/').pop().split('-')[0]
        const jxUrl = playerConfig[from] && playerConfig[from].parse ? playerConfig[from].parse : ''

        if (!jxUrl) {
            const indexUrl = `${appConfig.site}/addons/dp/player/index.php?key=0&id=${id}&uid=0&from=${from}&url=${videoUrl}`
            const { data: indexData } = await $fetch.get(indexUrl, {
                headers: {
                    'User-Agent': UA,
                },
            })
            const playerUrl = appConfig.site + indexData.match(/href="(.+)";/)[1]
            if (playerUrl.includes('art.php')) {
                const { data: artData } = await $fetch.get(playerUrl, {
                    headers: {
                        'User-Agent': UA,
                    },
                })

                const config = new Function('return ' + artData.match(/config\s*=\s*({[\s\S]*?})\s*if\s*\(/)[1])()
                const playUrl = config.url
                return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA }] })
            } else {
                // Handle dp.php or other player pages
                const { data: playerData } = await $fetch.get(playerUrl, {
                    headers: {
                        'User-Agent': UA,
                    },
                })
                // Try to extract config object from playerData
                const configMatch = playerData.match(/config\s*=\s*(\{[\s\S]*?\})\s*(?:;|if\s*\()/)
                if (configMatch) {
                    const config = new Function('return ' + configMatch[1])()
                    const playUrl = config.url
                    return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA }] })
                }
                // Fallback: try to find direct video URL
                const videoMatch = playerData.match(/https?:\/\/[^\s"']+\.(?:mp4|m3u8|flv)/)
                if (videoMatch) {
                    return jsonify({ urls: [videoMatch[0]], headers: [{ 'User-Agent': UA }] })
                }
                // If nothing found, return empty array
                return jsonify({ urls: [], headers: [{ 'User-Agent': UA }] })
            }
        } else if (jxUrl && jxUrl.includes('ec.php')) {
            const { data: jxData } = await $fetch.get(jxUrl + videoUrl, {
                headers: {
                    'User-Agent': UA,
                },
            })
            const ConFig = JSON.parse(jxData.match(/ConFig\s*=\s*({[\s\S]*?})\s*,\s*box/)[1])
            const playUrl = decrypt(ConFig['url'])

            return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA }] })

            function decrypt(d) {
                let ut = CryptoJS.enc.Utf8.parse('2890' + ConFig['config']['uid'] + 'tB959C'),
                    mm = CryptoJS.enc.Utf8.parse('2F131BE91247866E'),
                    decrypted = CryptoJS.AES.decrypt(d, ut, {
                        iv: mm,
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7,
                    })
                return CryptoJS.enc.Utf8.stringify(decrypted)
            }
        }
    } else if (config.url.endsWith('.m3u8')) {
        return jsonify({ urls: [config.url], headers: [{ 'User-Agent': UA }] })
    }
    // Default return for unmatched cases
    return jsonify({ urls: [], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/vodsearch/${text}----------${page}---.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('div.video').each((_, element) => {
        const href = $(element).find('a.video-wrapper').attr('href')
        const title = $(element).find('img.videoimg').attr('alt')
        const cover = $(element).find('img.videoimg').attr('src')
        const subTitle = $(element).find('.video-time').text().trim()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

function base64Decode(str) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(str))
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
 * args.url = 一级分类 type_id (tab.ext.id 如 '1'/'5'/'2'/'4')
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
            // vod_id 存详情页完整URL，供 getVideoDetail 使用
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

/**
 * 获取二级分类视频列表 (本源无二级分类，同 getVideoList)
 */
async function getSubclassVideoList(args) {
    return await getVideoList(args)
}

/**
 * 获取视频详情 (对应 XPTV getTracks)
 * args.url = 详情页完整URL (vod_id)
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
        var ext = jsonify({ url: url })
        var result = JSON.parse(await getTracks(ext))
        var lists = result.list || []

        // 构建多线路 vod_play_url
        // 格式: 线路1$集1$URL1#集2$URL2#$$$线路2$集1$URL1#
        // uzVideo 用 $$$ 分隔多线路
        var lines = []
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
                lines.push(lineName + '$' + eps.join('#'))
            }
        }

        var det = new VideoDetail()
        det.vod_id = url
        det.vod_play_url = lines.join('$$$')
        det.vod_play_from = lists.map(function(l) { return l.title || '线路' }).join('$$$')

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
                Referer: appConfig.site + '/',
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
