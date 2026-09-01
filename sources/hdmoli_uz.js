// ignore
//@name:hdmoli
//@version:1
//@webSite:https://hdmoli.pro
//@remark:移植自 XPTV hdmoli.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV hdmoli.js
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
    'Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'hdmoli',
    site: 'https://hdmoli.pro',
    tabs: [
        {
            name: '电影',
            ext: {
                id: 1,
            },
        },
        {
            name: '剧集',
            ext: {
                id: 2,
            },
        },
        {
            name: '动画',
            ext: {
                id: 41,
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    let url = `${appConfig.site}/mlist/index${id}-${page}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    let videolist = $('.myui-vodlist > li')
    videolist.each((_, element) => {
        const a = $(element).find('.myui-vodlist__thumb')
        const href = a.attr('href')
        const title = a.attr('title')
        const cover = a.attr('data-original')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                href: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let groups = []
    let href = ext.href
    let url = appConfig.site + href

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const playlist = $('ul.myui-content__list')
    playlist.each((index, e) => {
        const eps = $(e).find('li')
        let group = {
            title: `線路${index + 1}`,
            tracks: [],
        }
        eps.each((_, e) => {
            const name = $(e).find('a').text()
            const href = $(e).find('a').attr('href')
            group.tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: href,
                },
            })
        })
        groups.push(group)
    })

    const panlist = $('.stui-vodlist__text.downlist p')
    const pangroup = {
        title: '',
        tracks: [],
    }
    panlist.each((_, e) => {
        const name = $(e).find('b').text().replace('：', '')
        const link = $(e).find('a').attr('href')
        pangroup.tracks.push({
            name: name,
            pan: link,
        })
    })
    groups.push(pangroup)

    return jsonify({
        list: groups,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = appConfig.site + ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const encUrl = $('script:contains(var now=)').text().split('var now="')[1].split('";')[0].split('|')[0]
    if (encUrl.endsWith('.mp4')) {
        return jsonify({
            urls: ['https://v.damoli.pro/v/' + encUrl],
            headers: [
                {
                    'User-Agent': UA,
                    Referer: 'https://hdmoli.pro/',
                },
            ],
        })
    }

    let parseUrl = appConfig.site + '/api/webvideo_ty.php?url=' + encUrl + '&type=json'
    if (encUrl.length === 32) {
        parseUrl = appConfig.site + '/api/webvideo.php?url=' + encUrl + '&type=json'
    }
    const parseRes = await $fetch.get(parseUrl, {
        headers: {
            'User-Agent': UA,
        },
    })
    const encData = argsify(parseRes.data).url
    const realUrl = decryptUrl(encData)

    return jsonify({
        urls: [realUrl],
    })
}

function decryptUrl(encData) {
    const b64Data = base64Decode(encData)
    let url = ''
    for (let i = 0; i < b64Data.length; i++) {
        let idx = i % 8
        url += String.fromCharCode(b64Data.charCodeAt(i) ^ 'ItLdg666'.charCodeAt(idx))
    }
    return base64Decode(url)
}

function base64Decode(text) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search.php?page=${page}&searchword=${text}&searchtype=`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    $('.myui-vodlist__thumb').each((_, element) => {
        const a = $(element)
        const href = a.attr('href')
        const title = a.attr('title')
        const cover = a.attr('data-original')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                href: href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
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
