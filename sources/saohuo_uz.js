// ignore
//@name:燒火電影
//@version:1
//@webSite:https://saohuo.tv
//@remark:移植自 XPTV saohuo.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV saohuo.js
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

const CryptoJS = createCryptoJS()
const cheerio = createCheerio()

const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
}

let appConfig = {
    ver: 1,
    title: '燒火電影',
    site: 'https://saohuo.tv',
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

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext
    const url = `${appConfig.site}/list/${id}-${page}.html`

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    let elems = $html.elements(data, 'ul.v_list div.v_img')
    elems.forEach((element) => {
        const href = $html.attr(element, 'a', 'href')
        const title = $html.attr(element, 'a', 'title')
        const cover = $html.attr(element, 'img', 'data-original')
        const subTitle = $html.text(element, '.v_note')
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
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

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    const $ = cheerio.load(data)

    let play_from = []
    $('ul.from_list li').each((_, e) => {
        play_from.push($(e).text().trim())
    })

    $('#play_link li').each((i, e) => {
        const from = play_from[i]
        const eps = $(e).find('a')
        let temp = []
        eps.each((_, e) => {
            const name = $(e).text()
            const href = $(e).attr('href')
            temp.push({
                name: `${name}`,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
        temp.sort((a, b) => {
            return a.name.split('-')[1] - b.name.split('-')[1]
        })
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
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    if (data) {
        const $ = cheerio.load(data)
        const iframeUrl = $('iframe').attr('src')
        const apiUrl = iframeUrl.match(/^(https?:\/\/[^\/]+)/)[1] + '/api.php'

        const resp = await $fetch.get(iframeUrl, {
            headers: headers,
        })
        if (resp.data) {
            const $ = cheerio.load(resp.data)
            const script = $('body script').text()
            const url = script.match(/var url = "(.*)"/)[1]
            const t = script.match(/var t = "(.*)"/)[1]
            const keyStr = script.match(/var key = (.*?);/)[1]
            const act = script.match(/var act = "(.*?)";/)[1]
            const play = script.match(/var play = "(.*?)";/)[1]

            let func = ''
            const specifiedContent = 'function ' + keyStr.split('(')[0]
            const regex = new RegExp(`^.*${specifiedContent}.*$`, 'gm')
            func = script.match(regex)[0].replace('atob', 'base64Decode')
            const key = eval(func + keyStr)

            const params = {
                url: url,
                t: t,
                key: key,
                act: act,
                play: play,
            }

            const presp = await $fetch.post(apiUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': headers['User-Agent'],
                    Referer: iframeUrl,
                },
            })

            const result = JSON.parse(presp.data)

            let playUrl = /http/.test(result.url) ? result.url : iframeUrl.match(/^(https?:\/\/[^\/]+)/)[1] + result.url
            return jsonify({ urls: [playUrl] })
        }
    }
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []
    const ocrApi = 'https://api.nn.ci/ocr/b64/json'
    let cookie = 'PHPSESSID=' + generatePHPSESSID()

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    if (page > 1) {
        return jsonify({
            list: cards,
        })
    }

    let validate = appConfig.site + '/include/vdimgck.php'
    let url = appConfig.site + '/search.php?scheckAC=check&page=&searchtype=&order=&tid=&area=&year=&letter=&yuyan=&state=&money=&ver=&jq='

    let img = await $fetch.download(validate, {
        headers: {
            'User-Agent': headers['User-Agent'],
            cookie: cookie,
        },
    })

    function binaryStringToBase64(binaryString) {
        const byteArray = []
        for (let i = 0; i < binaryString.length; i += 8) {
            const byte = binaryString.slice(i, i + 8)
            byteArray.push(parseInt(byte, 2)) // convert 8 bits to a byte
        }

        const uint8Array = new Uint8Array(byteArray)
        const wordArray = CryptoJS.lib.WordArray.create(uint8Array)
        return CryptoJS.enc.Base64.stringify(wordArray)
    }

    let b64 = binaryStringToBase64(img.data)

    let ocrRes = await $fetch.post(ocrApi, b64, {
        headers: {
            'User-Agent': headers['User-Agent'],
            cookie: cookie,
        },
    })
    let vd = argsify(ocrRes.data).result

    let searchRes = await $fetch.post(url, `validate=${vd.toUpperCase()}&searchword=${text}`, {
        headers: {
            'user-agent': headers['User-Agent'],
            cookie: cookie,
            'content-type': 'application/x-www-form-urlencoded',
        },
    })
    let html = searchRes.data

    const $ = cheerio.load(html)

    $('ul.v_list div.v_img').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('a').attr('title')
        const cover = $(element).find('img').attr('data-original')
        const subTitle = $(element).find('.v_note').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

function generatePHPSESSID() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const length = 26
    let sessionId = ''

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        sessionId += characters[randomIndex]
    }

    return sessionId
}

function base64Decode(text) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
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
