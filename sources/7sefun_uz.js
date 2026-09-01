// ignore
//@name:七色番
//@version:1
//@webSite:https://www.7sefun.top
//@remark:移植自 XPTV 7sefun.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV 7sefun.js
// 转换工具: tools/convert_xptv.py
// 原理: XPTV兼容shim + uzVideo wrapper
// ============================================================

// ---------- XPTV 兼容层 (polyfill) ----------

const $$cheerio = cheerio;
const $$crypto = Crypto;

const $fetch = {
    async get(url, options) {
        const resp = await req(url, options || {});
        return { data: resp.data, headers: resp.headers, code: resp.code };
    },
    async post(url, body, options) {
        const opts = options || {};
        opts.method = 'POST';
        if (body !== undefined) opts.body = body;
        const resp = await req(url, opts);
        return { data: resp.data, headers: resp.headers, code: resp.code };
    },
    async download(url, options) {
        const opts = options || {};
        opts.responseType = 'arraybuffer';
        const resp = await req(url, opts);
        return { data: resp.data, headers: resp.headers, code: resp.code };
    },
};

const $html = {
    elements(html, selector) {
        if (!html) return [];
        const $ = $$cheerio.load(html);
        const out = [];
        $(selector).each(function (i, el) {
            out.push($(el).toString());
        });
        return out;
    },
    attr(html, selector, attrName) {
        if (!html) return '';
        const $ = $$cheerio.load(html);
        const v = $(selector).attr(attrName);
        return v || '';
    },
    text(html, selector) {
        if (!html) return '';
        const $ = $$cheerio.load(html);
        return $(selector).text().trim();
    },
};

const $$cacheStore = {};
const $cache = {
    get(key) { return $$cacheStore[key]; },
    set(key, value) { $$cacheStore[key] = value; },
};

const $print = console.log;

function argsify(jsonStr) {
    try {
        if (typeof jsonStr === 'object') return jsonStr;
        return JSONbig.parse(jsonStr);
    } catch (e) { return {}; }
}

function jsonify(obj) { return JSON.stringify(obj); }

function createCheerio() { return $$cheerio; }
function createCryptoJS() { return $$crypto; }

// ---------- 原始 XPTV 代码 ----------

const cheerio = createCheerio()
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
    let config = appConfig
    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    const url = `${appConfig.site}/vodshow/${id}--time------${page}---.html`

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
    })
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
// uzVideo 扩展接口适配层 (wrapper)
// ============================================================

async function getClassList(args) {
    var backData = new RepVideoClassList();
    try {
        var config = await getConfig();
        var cfg = typeof config === 'string' ? JSON.parse(config) : config;
        var list = [];
        var tabs = cfg.tabs || [];
        for (var i = 0; i < tabs.length; i++) {
            var vc = new VideoClass();
            vc.type_id = String(tabs[i].id || tabs[i].name || i);
            vc.type_name = String(tabs[i].name || tabs[i].id || '');
            vc.hasSubclass = false;
            list.push(vc);
        }
        backData.data = list;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getSubclassList(args) {
    var backData = new RepVideoSubclassList();
    try { backData.data = new VideoSubclass(); }
    catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getVideoList(args) {
    var backData = new RepVideoList();
    try {
        var xptvArgs = { url: args.url, page: args.page || 1 };
        var result = await getCards(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var cards = parsed.list || [];
        var list = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var vd = new VideoDetail();
            vd.vod_id = String(c.vod_id || '');
            vd.vod_name = c.vod_name || '';
            vd.vod_pic = c.vod_pic || '';
            vd.vod_remarks = c.vod_remarks || '';
            list.push(vd);
        }
        backData.data = list;
        backData.total = list.length;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getSubclassVideoList(args) {
    var backData = new RepVideoList();
    try {
        var xptvArgs = { url: args.url, page: args.page || 1 };
        var result = await getCards(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var cards = parsed.list || [];
        var list = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var vd = new VideoDetail();
            vd.vod_id = String(c.vod_id || '');
            vd.vod_name = c.vod_name || '';
            vd.vod_pic = c.vod_pic || '';
            vd.vod_remarks = c.vod_remarks || '';
            list.push(vd);
        }
        backData.data = list;
        backData.total = list.length;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getVideoDetail(args) {
    var backData = new RepVideoDetail();
    try {
        var xptvArgs = { url: args.url };
        var result = await getTracks(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var groups = parsed.list || [];
        var vd = new VideoDetail();
        vd.vod_id = String(args.url);
        var playFromParts = [];
        var playUrlParts = [];
        for (var g = 0; g < groups.length; g++) {
            var group = groups[g];
            playFromParts.push(group.title || ('线路' + (g + 1)));
            var trackParts = [];
            var tracks = group.tracks || [];
            for (var t = 0; t < tracks.length; t++) {
                var track = tracks[t];
                var trackName = track.name || ('第' + (t + 1) + '集');
                var trackUrl = track.url || track.playUrl || '';
                trackParts.push(trackName + '$' + trackUrl);
            }
            playUrlParts.push(trackParts.join('#'));
        }
        vd.vod_play_from = playFromParts.join('$$$');
        vd.vod_play_url = playUrlParts.join('$$$');
        backData.data = vd;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl();
    try {
        var xptvArgs = { url: args.url };
        var result = await getPlayinfo(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        if (parsed.urls && parsed.urls.length > 0) {
            for (var i = 0; i < parsed.urls.length; i++) {
                backData.urls.push({
                    url: parsed.urls[i],
                    headers: parsed.headers || [],
                });
            }
        }
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}

async function searchVideo(args) {
    var backData = new RepVideoList();
    try {
        var xptvArgs = { searchWord: args.searchWord, page: args.page || 1 };
        var result = await search(xptvArgs);
        var parsed = typeof result === 'string' ? JSON.parse(result) : result;
        var cards = parsed.list || [];
        var list = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var vd = new VideoDetail();
            vd.vod_id = String(c.vod_id || '');
            vd.vod_name = c.vod_name || '';
            vd.vod_pic = c.vod_pic || '';
            vd.vod_remarks = c.vod_remarks || '';
            list.push(vd);
        }
        backData.data = list;
        backData.total = list.length;
    } catch (e) { backData.error = e.toString(); }
    return JSON.stringify(backData);
}
