// ignore
//@name:未知源
//@version:1
//@webSite:
//@remark:移植自 XPTV lmm85.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV lmm85.js
// 转换工具: tools/convert_xptv.py
// 原理: XPTV兼容shim + uzVideo wrapper
// ============================================================

// ---------- XPTV 兼容层 (polyfill) ----------

const $$cheerio = createCheerio();
const $$crypto = createCryptoJS();

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

// createCheerio/createCryptoJS 由 uzVideo 运行时提供，不在此定义

// loadJSEncrypt - XPTV runtime, uzVideo may not provide
function loadJSEncrypt() {
    return {
        setPublicKey(k) { this._pub = k; },
        setPrivateKey(k) { this._priv = k; },
        encrypt(t) { return t; },
        decrypt(t) { return t; },
    };
}

// $config_str - XPTV runtime config variable (usually empty in uzVideo context)
const $config_str = '';

// ---------- 原始 XPTV 代码 ----------

const CryptoJS = createCryptoJS()
const cheerio = createCheerio()

// 路漫漫在線動漫 - lmm85.com
// 類型：HTML scraping 動漫站
// 播放器：yun.92cj.com (404.php + ecvod.php) - AES token 解密
// 搜索：smart_verify 繞過驗碼（md5(ts + "MySecretlmm2026")）

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const SITE = 'https://www.lmm85.com'
const HEADERS = {
    'User-Agent': UA,
    Referer: SITE + '/',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

// === AES token 解密（預計算 key，只執行一次） ===

function _b64d(s) {
    const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    const r = []
    let i = 0
    while (i < s.length) {
        const c1 = a.indexOf(s[i])
        let c2 = i + 1 < s.length ? a.indexOf(s[i + 1]) : 0
        let c3 = i + 2 < s.length ? a.indexOf(s[i + 2]) : 0
        let c4 = i + 3 < s.length ? a.indexOf(s[i + 3]) : 0
        if (c2 < 0) c2 = 0
        if (c3 < 0) c3 = 0
        if (c4 < 0) c4 = 0
        const n = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4
        r.push(String.fromCharCode((n >> 16) & 255))
        if (c3 !== 64) r.push(String.fromCharCode((n >> 8) & 255))
        if (c4 !== 64) r.push(String.fromCharCode(n & 255))
        i += 4
    }
    return r.join('')
}

const _XOR_KEY = 'daolianlaopowanrenlun'
const _rk1 = _b64d('BlILGwo2OBoAATIXE1NXCwQALg0KE1xS')
let _rk2 = ''
for (let i = 0; i < _rk1.length; i++) {
    _rk2 += String.fromCharCode(_rk1.charCodeAt(i) ^ _XOR_KEY.charCodeAt(i % _XOR_KEY.length))
}
const _AES_KEY = [..._b64d(_rk2)].sort((a, b) => a.localeCompare(b, 'zh-CN')).join('')
const _AES_IV = '1348987635684651'

function getc(encToken) {
    try {
        // const CryptoJS = createCryptoJS()
        const keyParsed = CryptoJS.enc.Utf8.parse(_AES_KEY)
        const ivParsed = CryptoJS.enc.Utf8.parse(_AES_IV)
        const decrypted = CryptoJS.AES.decrypt(encToken, keyParsed, {
            iv: ivParsed,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        })
        return decrypted.toString(CryptoJS.enc.Utf8)
    } catch (e) {
        console.error('getc error:', e)
        return ''
    }
}

async function getConfig() {
    return jsonify({
        ver: 1,
        title: '路漫漫動漫',
        site: SITE,
        tabs: [
            { name: '番劇', ext: { id: 'dongman' }, ui: 1 },
            { name: '日本動漫', ext: { id: 'ribendongman' }, ui: 1 },
            { name: '國產動漫', ext: { id: 'guochandongman' }, ui: 1 },
            { name: '歐美動漫', ext: { id: 'oumeidongman' }, ui: 1 },
            { name: '動態漫畫', ext: { id: 'dongtaiman' }, ui: 1 },
            { name: '電影', ext: { id: 'dianying' }, ui: 1 },
            { name: '日本特攝劇', ext: { id: 'teshepian' }, ui: 1 },
            { name: '日本動畫電影', ext: { id: 'ribendonghuadianying' }, ui: 1 },
            { name: '國產動畫電影', ext: { id: 'guochandonghuadianying' }, ui: 1 },
            { name: '歐美動畫電影', ext: { id: 'oumeidonghuadianying' }, ui: 1 },
        ],
    })
}

async function getCards(ext) {
    ext = argsify(ext)
    const { id, page = 1 } = ext

    let url
    if (page === 1) {
        url = `${SITE}/type/${id}.html`
    } else {
        url = `${SITE}/type/${id}_${page}.html`
    }

    const { data } = await $fetch.get(url, { headers: HEADERS })
    // const cheerio = createCheerio()
    const $ = cheerio.load(data)
    const list = []

    $('.video-img-box').each((i, el) => {
        const $el = $(el)
        const $link = $el.find('.img-box a').first()
        const href = $link.attr('href') || ''
        const idMatch = href.match(/\/detail\/(\d+)\.html/)
        if (!idMatch) return

        const vid = idMatch[1]
        const $img = $el.find('img').first()
        const img = $img.attr('data-src') || $img.attr('src') || ''
        const title = $el.find('h6.title a').text().trim() || ''
        const remark = $el.find('.img-box span.label').first().text().trim() || ''

        if (title) {
            list.push({
                vod_id: vid,
                vod_name: title,
                vod_pic: img,
                vod_remarks: remark,
                ext: { id: vid },
            })
        }
    })

    return jsonify({ list, page })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const { id } = ext

    const url = `${SITE}/detail/${id}.html`
    const { data } = await $fetch.get(url, { headers: HEADERS })
    // const cheerio = createCheerio()
    const $ = cheerio.load(data)
    const lists = []

    $('.module-tab-item.tab-item').each((i, el) => {
        const name = $(el).text().trim()
        if (name) {
            lists.push({
                title: name,
                tracks: [],
            })
        }
    })

    $('.scroll-content').each((i, el) => {
        const tracks = $(el).find('a')
        $(tracks).each((j, a) => {
            const $el = $(a)
            const href = $el.attr('href') || ''
            const name = $el.text().trim()
            const playMatch = href.match(/\/play\/(\d+)_(\d+)_(\d+)\.html/)
            if (!playMatch || !name) return

            lists[i].tracks.push({
                name: name,
                ext: { url: href },
            })
        })
    })

    return jsonify({
        list: lists,
    })
}

async function getPlayinfo(ext) {
    try {
        ext = argsify(ext)
        const { url } = ext
        if (!url) return jsonify({ urls: [] })

        const playUrl = SITE + url
        const { data } = await $fetch.get(playUrl, { headers: HEADERS })

        // const cheerio = createCheerio()
        // const $ = cheerio.load(data)

        // 從頁面 script 中提取 player_aaaa
        const playerMatch = data.match(/var\s+player_aaaa\s*=\s*(\{[^;]+?\})\s*;?\s*<\/script>/)
        if (!playerMatch) return jsonify({ urls: [] })

        const player = JSON.parse(playerMatch[1])
        const vid = player.url || ''
        const from = player.from || ''

        if (!vid) return jsonify({ urls: [] })

        let iframeUrl
        if (vid.startsWith('http') && vid.endsWith('.m3u8')) {
            return jsonify({
                urls: [vid],
                headers: [{ 'User-Agent': UA, Referer: playUrl }],
            })
        } else if (from === 'tudou') {
            iframeUrl = `https://yun.92cj.com/acfun58.php?id=${vid}&referer=${encodeURIComponent(playUrl)}`
        } else if (from === 'vxdev') {
            iframeUrl = `https://yun.92cj.com/yunbox/?type=vxdev&vid=${vid}&referer=${encodeURIComponent(playUrl)}`
        } else if (from === 'xgvxcd') {
            iframeUrl = `https://yun.92cj.com/yunbox/?type=vxcd&vid=${vid}&referer=${encodeURIComponent(playUrl)}`
        } else if (from === 'ykbox') {
            iframeUrl = `https://yun.92cj.com/404.php?host=4khls&vid=${vid}&referer=${encodeURIComponent(playUrl)}`
        } else {
            console.log('unknown source :' + from)
        }

        // 獲取 iframe 頁面
        const { data: iframeHtml } = await $fetch.get(iframeUrl, {
            headers: {
                'User-Agent': UA,
                Referer: SITE + '/',
                'sec-fetch-dest': 'iframe',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-site',
            },
        })

        // 從 iframe HTML 中動態提取 $.post("XXX.php") 端點
        const postEndpointMatch = iframeHtml.match(/\$\.post\("([^"]+)"/)
        const postEndpoint = postEndpointMatch ? postEndpointMatch[1] : 'ecvod.php'

        // 提取 vid, t, token
        const vidMatch = iframeHtml.match(/var\s+vid\s*=\s*"([^"]+)"/)
        const tMatch = iframeHtml.match(/var\s+t\s*=\s*"([^"]+)"/)
        const tokenMatch = iframeHtml.match(/var\s+token\s*=\s*"([^"]+)"/)

        if (vidMatch && tMatch && tokenMatch) {
            const iframeVid = vidMatch[1]
            const t = tMatch[1]
            const decryptedToken = getc(tokenMatch[1])

            if (decryptedToken) {
                // POST 到動態端點
                const postBody = `vid=${encodeURIComponent(iframeVid)}&t=${t}&token=${encodeURIComponent(decryptedToken)}&act=0&play=1`

                try {
                    const apiUrl = `https://yun.92cj.com/yunbox/${postEndpoint}`
                    const { data: respData } = await $fetch.post(apiUrl, postBody, {
                        headers: {
                            'User-Agent': UA,
                            Referer: iframeUrl,
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                            Origin: 'https://yun.92cj.com',
                            'X-Requested-With': 'XMLHttpRequest',
                            Accept: 'application/json, text/javascript, */*; q=0.01',
                        },
                    })

                    const result = JSON.parse(respData)

                    if (result.code === 200 && result.url) {
                        // ext=mp4: 直接播放
                        if (result.ext === 'mp4') {
                            const headers = { 'User-Agent': UA }
                            if (result.referer !== 'never') {
                                headers.Referer = playUrl
                            }
                            return jsonify({
                                urls: [result.url],
                                headers: [headers],
                            })
                        }
                    }
                } catch (e) {
                    console.log(e)
                }
            }
        }

        return jsonify({ urls: [] })
    } catch (e) {
        console.error('getPlayinfo error:', e)
        return jsonify({ urls: [] })
    }
}

async function search(ext) {
    ext = argsify(ext)
    const { text, wd, page = 1 } = ext
    const keyword = text || wd || ''

    if (!keyword || page > 1) return jsonify({ list: [], page })

    const searchUrl = `${SITE}/vod/search.html?wd=${encodeURIComponent(keyword)}`

    // 第一次訪問搜索頁，獲取服務端分配的 PHPSESSID
    let cookieStr = ''
    try {
        const firstVisit = await $fetch.get(searchUrl, { headers: HEADERS })
        const setCookie = firstVisit.respHeaders?.['set-cookie'] || firstVisit.respHeaders?.['Set-Cookie'] || ''
        const sessMatch = String(setCookie).match(/PHPSESSID=([^;]+)/)
        if (sessMatch) {
            cookieStr = `PHPSESSID=${sessMatch[1]}`
        }
    } catch (e) {}

    // 沒拿到 session 就用隨機 ID
    if (!cookieStr) {
        const CryptoJS = createCryptoJS()
        const sessId = CryptoJS.MD5(String(Date.now())).toString().substring(0, 26)
        cookieStr = `PHPSESSID=${sessId}`
    }

    // 通過 smart_verify 驗證這個 session
    try {
        const ts = String(Math.floor(Date.now() / 1000))
        const smartToken = CryptoJS.MD5(ts + 'MySecretlmm2026').toString()
        const { data: verifyData } = await $fetch.post(
            `${SITE}/index.php/ajax/smart_verify`,
            `smart_token=${encodeURIComponent(smartToken)}&ts=${ts}`,
            {
                headers: {
                    'User-Agent': UA,
                    Referer: searchUrl,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    Cookie: cookieStr,
                },
            },
        )
    } catch (e) {
        console.log(e)
    }

    // 用已驗證的 session 重新搜索
    const { data } = await $fetch.get(searchUrl, {
        headers: { ...HEADERS, Cookie: cookieStr },
    })

    // 檢測驗碼保護
    if (data.includes('安全验证') || data.includes('请输入验证码')) {
        return jsonify({ list: [], page })
    }

    // const cheerio = createCheerio()
    const $ = cheerio.load(data)
    const list = []

    $('.video-img-box').each((i, el) => {
        const $el = $(el)
        const $link = $el.find('.img-box a').first()
        const href = $link.attr('href') || ''
        const idMatch = href.match(/\/detail\/(\d+)\.html/)
        if (!idMatch) return

        const vid = idMatch[1]
        const $img = $el.find('img').first()
        const img = $img.attr('data-src') || $img.attr('src') || ''
        const title = $el.find('h6.title a').text().trim() || ''
        const remark = $el.find('.img-box span.label').first().text().trim() || ''

        if (title) {
            list.push({
                vod_id: vid,
                vod_name: title,
                vod_pic: img,
                vod_remarks: remark,
                ext: { id: vid },
            })
        }
    })

    return jsonify({ list, page })
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
            backData.data = {
                url: parsed.urls[0],
                header: parsed.headers || {},
            };
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
