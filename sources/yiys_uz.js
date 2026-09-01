// ignore
//@name:未知源
//@version:1
//@webSite:
//@remark:移植自 XPTV yiys.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV yiys.js
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

const UA = 'Android/OkHttp'
const SITE = 'https://aleig4ah.yiys05.com'
const PUB_KEY =
    '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw4qpeOgv+MeXi57MVPqZF7SRmHR3FUelCTfrvI6vZ8kgTPpe1gMyP/8ZTvedTYjTDMqZBmn8o8Ym98yTx3zHaskPpmDR80e+rcRciPoYZcWNpwpFkrHp1l6Pjs9xHLXzf3U+N3a8QneY+jSMvgMbr00DC4XfvamfrkPMXQ+x9t3gNcP5YtuRhGFREBKP2q20gP783MCOBFwyxhZTIAsFiXrLkgZ97uaUAtqW6wtKR4HWpeaN+RLLxhBdnVjuMc9jaBl6sHMdSvTJgAajBTAd6LLA9cDmbGTxH7RGp//iZU86kFhxGl5yssZvBcx/K95ADeTmLKCsabexZVZ0Fu3dDQIDAQAB\n-----END PUBLIC KEY-----'

let host = SITE
let token = ''
let appId = ''

const filterList = {}

function sha256(str) {
    return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex)
}

function genId() {
    const chars = '0123456789abcdef'
    let r = ''
    for (let i = 0; i < 16; i++) r += chars[Math.floor(Math.random() * 16)]
    return r
}

function ts() {
    return Math.floor(Date.now() / 1000).toString()
}

function qs(obj) {
    return Object.keys(obj)
        .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
        .join('&')
}

// RSA public key decrypt using JSEncrypt
function rsaPubDecrypt(b64Data) {
    try {
        const JSEncrypt = loadJSEncrypt()
        const crypt = new JSEncrypt()
        crypt.setPublicKey(PUB_KEY)
        const rsaKey = crypt.getKey()
        const BI = rsaKey.n.constructor

        // Cipher bytes → hex → BigInteger
        const wa = CryptoJS.enc.Base64.parse(b64Data)
        let cipherHex = ''
        for (let i = 0; i < wa.sigBytes; i++) {
            const b = (wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
            cipherHex += ('0' + b.toString(16)).slice(-2)
        }

        const biCipher = new BI(cipherHex, 16)
        const biResult = rsaKey.doPublic(biCipher)

        // Pad result hex to modulus byte length (fix leading zeros)
        const modHexLen = rsaKey.n.toString(16).length
        const modByteLen = Math.ceil(modHexLen / 2)
        let resultHex = biResult.toString(16)
        while (resultHex.length < modByteLen * 2) resultHex = '0' + resultHex

        // Hex → bytes
        const bytes = []
        for (let i = 0; i < resultHex.length; i += 2) {
            bytes.push(parseInt(resultHex.substring(i, i + 2), 16))
        }

        // PKCS#1 v1.5 type 1 unpad: 00 01 ff...ff 00 <message>
        if (bytes.length >= 2 && bytes[0] === 0x00 && bytes[1] === 0x01) {
            for (let j = 2; j < bytes.length; j++) {
                if (bytes[j] === 0x00) {
                    const msg = bytes.slice(j + 1)
                    let s = ''
                    for (let k = 0; k < msg.length; k++) s += String.fromCharCode(msg[k])
                    try {
                        return decodeURIComponent(escape(s))
                    } catch (e) {
                        return s
                    }
                }
            }
        }
        // Fallback: strip leading zeros
        let start = 0
        while (start < bytes.length && bytes[start] === 0x00) start++
        const msg = bytes.slice(start)
        let s = ''
        for (let k = 0; k < msg.length; k++) s += String.fromCharCode(msg[k])
        try {
            return decodeURIComponent(escape(s))
        } catch (e) {
            return s
        }
    } catch (e) {
        console.log('RSA decrypt error:', e.message || e)
        return ''
    }
}

function computeHash(params) {
    const keys = Object.keys(params).sort()
    const pairs = keys.map((k) => k + '=' + params[k])
    const full = pairs.join('&') + '&token=' + token
    return sha256(full)
}

function getHeaders(params) {
    const h = {
        'User-Agent': UA,
        Connection: 'Keep-Alive',
        'APP-ID': appId,
        Authorization: '',
    }
    if (params) h['X-HASH-Data'] = computeHash(params)
    return h
}

async function refreshToken() {
    const payload = { appID: appId, timestamp: ts() }
    try {
        const resp = await $fetch.post(host + '/vod-app/index/getGenerateKey', qs(payload), {
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Auth-Flow': '1',
            },
        })
        const json = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data
        if (json && json.data) {
            token = rsaPubDecrypt(json.data)
            return !!token
        }
    } catch (e) {
        console.log('refreshToken error:', e.message || e)
    }
    return false
}

async function apiReq(url, payload) {
    const headers = getHeaders(payload)
    const body = qs(payload)
    let resp = await $fetch.post(url, body, {
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const content = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data)
    if (resp.status === 400 || (!content && Object.keys(resp.respHeaders || {}).length === 0)) {
        await refreshToken()
        const h2 = getHeaders(payload)
        resp = await $fetch.post(url, body, {
            headers: { ...h2, 'Content-Type': 'application/x-www-form-urlencoded' },
        })
    }
    return typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data
}

async function getConfig() {
    if (!appId) appId = genId()
    if (!token) await refreshToken()

    const params = { timestamp: ts() }
    const json = await apiReq(host + '/vod-app/type/list', params)

    const tabs = []
    const items = json.data || []

    for (const item of items) {
        const tid = item.typeId.toString()
        tabs.push({ name: item.typeName, ext: { id: tid } })

        const ext = item.type_extend_obj
        if (ext) {
            const filters = []
            const mkFilter = (key, name, str) => {
                const vals = [{ n: '全部', v: '' }]
                if (str) {
                    str.split(',').forEach((s) => {
                        s = s.trim()
                        if (s) vals.push({ n: s, v: s })
                    })
                }
                filters.push({ key, name, value: vals })
            }
            if (ext.class) mkFilter('classType', '类型', ext.class)
            if (ext.area) mkFilter('area', '地区', ext.area)
            if (ext.lang) mkFilter('lang', '语言', ext.lang)
            if (ext.year) mkFilter('year', '年份', ext.year)
            filters.push({
                key: 'sort',
                name: '排序',
                value: [
                    { n: '新上线', v: 'time' },
                    { n: '热播榜', v: 'hits_day' },
                    { n: '好评榜', v: 'score' },
                ],
            })
            if (filters.length > 0) filterList[tid] = filters
        }
    }

    return jsonify({
        ver: 1,
        title: '意影视',
        site: host,
        tabs: tabs,
    })
}

async function getCards(ext) {
    if (!appId) appId = genId()
    if (!token) await refreshToken()
    ext = argsify(ext)
    const { id: tid, page = 1, filters = {} } = ext

    try {
        const raw = {
            tid: tid,
            page: page,
            limit: '12',
            timestamp: ts(),
            classType: filters.classType || '',
            area: filters.area || '',
            lang: filters.lang || '',
            year: filters.year || '',
            by: filters.sort || 'time',
        }
        const payload = {}
        for (const k of Object.keys(raw)) {
            if (raw[k] !== '' && raw[k] != null) payload[k] = raw[k]
        }

        const json = await apiReq(host + '/vod-app/vod/list', payload)
        const data = json.data || {}
        const items = data.data || []
        const totalPage = data.totalPageCount || 1

        const list = items.map((v) => ({
            vod_id: v.id.toString(),
            vod_name: v.name,
            vod_pic: v.vodPic,
            vod_remarks: v.vodRemarks || '',
            ext: { id: v.id.toString() },
        }))

        return jsonify({
            list: list,
            filter: filterList[tid] || [],
        })
    } catch (e) {
        console.log('getCards error:', e.message || e)
        return jsonify({ list: [], page: 1, pagecount: 1, filter: filterList[tid] || [] })
    }
}

async function getTracks(ext) {
    if (!appId) appId = genId()
    if (!token) await refreshToken()
    ext = argsify(ext)
    const vodId = ext.vod_id || ext.id

    try {
        const payload = {
            tid: '',
            timestamp: ts(),
            vodId: vodId.toString(),
        }
        const json = await apiReq(host + '/vod-app/vod/info', payload)
        const data = json.data || {}
        const sources = (data.vodSources || []).sort((a, b) => (a.sort || 0) - (b.sort || 0))

        const list = []
        for (const src of sources) {
            const tracks = []
            const urls = (src.vodPlayList && src.vodPlayList.urls) || []
            for (const u of urls) {
                tracks.push({
                    name: u.name,
                    ext: { sourceCode: src.sourceCode, url: u.url },
                })
            }
            if (tracks.length > 0) {
                list.push({ title: src.sourceName, tracks: tracks })
            }
        }

        return jsonify({ list: list })
    } catch (e) {
        console.log('getTracks error:', e.message || e)
        return jsonify({ list: [] })
    }
}

async function getPlayinfo(ext) {
    if (!appId) appId = genId()
    if (!token) await refreshToken()
    ext = argsify(ext)
    const { sourceCode, url: rawUrl } = ext

    try {
        let urlEncode = rawUrl
        if (rawUrl && rawUrl.startsWith('http')) {
            urlEncode = encodeURIComponent(rawUrl)
        }

        const payload = {
            sourceCode: sourceCode,
            timestamp: ts(),
            urlEncode: urlEncode,
        }
        const json = await apiReq(host + '/vod-app/vod/playUrl', payload)
        const data = json.data || {}
        const playUrl = data.url || ''

        if (playUrl && playUrl.startsWith('http')) {
            return jsonify({
                urls: [playUrl],
                headers: [{ 'User-Agent': UA }],
            })
        }

        if (rawUrl && rawUrl.startsWith('http')) {
            return jsonify({
                urls: [rawUrl],
                headers: [{ 'User-Agent': UA }],
            })
        }
    } catch (e) {
        console.log('getPlayinfo error:', e.message || e)
    }

    return jsonify({ urls: [] })
}

async function search(ext) {
    if (!appId) appId = genId()
    if (!token) await refreshToken()
    ext = argsify(ext)
    const { text, page = 1 } = ext

    try {
        const payload = {
            key: text,
            limit: '20',
            page: page.toString(),
            timestamp: ts(),
        }
        const json = await apiReq(host + '/vod-app/vod/segSearch', payload)
        const data = json.data || {}
        const items = data.data || []
        const totalPage = data.totalPageCount || 1

        const list = items.map((v) => ({
            vod_id: v.id.toString(),
            vod_name: v.name,
            vod_pic: v.vodPic,
            vod_remarks: v.vodRemarks || '',
            ext: { id: v.id.toString() },
        }))

        return jsonify({
            list: list,
            page: page,
            pagecount: totalPage,
        })
    } catch (e) {
        console.log('search error:', e.message || e)
        return jsonify({ list: [] })
    }
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
