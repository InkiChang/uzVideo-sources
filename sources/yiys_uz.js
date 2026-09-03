// ignore
//@name:意影视
//@version:1
//@webSite:https://aleig4ah.yiys05.com
//@remark:移植自 XPTV yiys.js (意影视APP后端 yiys05.com)，JSON API源，需RSA公钥解token
//@type:101
//@order: C
// ignore

// ============================================================
// XPTV → uzVideo polyfill 层（工具函数，与业务无关）
// ============================================================

// uzVideo 沙盒全局提供 Crypto (crypto-js 接口)
function createCryptoJS() { return Crypto }

// ---- loadJSEncrypt: 纯 Number limb-array RSA(2^24 进制, 乘积 <2^48 double 安全) ----
// uz 影视内置引擎不支持 BigInt 字面量/调用(报 invalid number literal), 彻底移除 BigInt
// API 与 JSEncrypt 对齐: setPublicKey(pem)/getKey()/RSAKey.doPublic(BigInteger)
function loadJSEncrypt() {
    var BASE_BITS = 24, BASE = 0x1000000, MASK = 0xffffff

    function norm(a) { while (a.length > 1 && a[a.length - 1] === 0) a.pop(); return a }

    function BigInteger(v, radix) {
        if (typeof v === 'number' && isFinite(v)) {
            var d = [], x = Math.floor(v)
            while (x > 0) { d.push(x % BASE); x = Math.floor(x / BASE) }
            this.d = d.length ? norm(d) : [0]
        } else {
            var h = String(v).replace(/^0x/i, '').replace(/^0+(?!$)/, '')
            var limbs = [], i = h.length
            while (i > 0) { var s = Math.max(0, i - 6); limbs.push(parseInt(h.substring(s, i), 16)); i = s }
            this.d = limbs.length ? norm(limbs) : [0]
        }
    }
    BigInteger.fromLimbs = function (d) {
        var o = Object.create(BigInteger.prototype)
        o.d = norm(d.slice())
        return o
    }
    BigInteger.prototype.toString = function (radix) {
        // 只需支持 16 (toString(16))
        var d = this.d
        if (d.length === 1 && d[0] === 0) return '0'
        var out = d[d.length - 1].toString(16)
        for (var i = d.length - 2; i >= 0; i--) {
            var h = d[i].toString(16)
            while (h.length < 6) h = '0' + h
            out += h
        }
        return out
    }

    // 小端 limb 数组算术
    function cmp(a, b) {
        if (a.length !== b.length) return a.length < b.length ? -1 : 1
        for (var i = a.length - 1; i >= 0; i--) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
        return 0
    }
    function sub(a, b) { // 要求 a >= b
        var r = [], br = 0
        for (var i = 0; i < a.length; i++) {
            var t = a[i] - (b[i] || 0) - br
            if (t < 0) { t += BASE; br = 1 } else { br = 0 }
            r.push(t)
        }
        return norm(r)
    }
    function mul(a, b) { // 竖式乘法, 中间量 < (2^24)^2 + 2^24 + 2^24 < 2^49 -> double 精确
        var r = [], i, j
        for (i = 0; i < a.length + b.length; i++) r.push(0)
        for (i = 0; i < a.length; i++) {
            var carry = 0
            for (j = 0; j < b.length; j++) {
                var t = a[i] * b[j] + r[i + j] + carry
                r[i + j] = t % BASE
                carry = Math.floor(t / BASE)
            }
            r[i + b.length] += carry
        }
        return norm(r)
    }
    function bitLen(a) {
        var top = a.length ? a[a.length - 1] : 0, b = 0
        while (top > 0) { b++; top = Math.floor(top / 2) }
        return (a.length - 1) * BASE_BITS + b
    }
    function getBit(a, i) {
        var w = a[(i / BASE_BITS) | 0] || 0
        return (w >> (i % BASE_BITS)) & 1
    }
    function shl1(a) { // a * 2
        var r = [], c = 0
        for (var i = 0; i < a.length; i++) {
            var t = a[i] * 2 + c
            r.push(t & MASK)
            c = t >= BASE ? 1 : 0
        }
        if (c) r.push(1)
        return r
    }
    function mod(a, m) { // 二进制长除法, 326-bit 模数 ≈ 1300 次迭代 * norms O(n)
        if (cmp(a, m) < 0) return norm(a.slice())
        var r = [0]
        for (var i = bitLen(a) - 1; i >= 0; i--) {
            r = shl1(r)
            if (getBit(a, i)) r[0] = (r[0] || 0) | 1
            if (cmp(r, m) >= 0) r = sub(r, m)
        }
        return r
    }
    function modPowLimbs(base, exp, modulus) {
        var b = mod(base.slice(), modulus)
        var r = [1]
        var nb = bitLen(exp)
        for (var i = nb - 1; i >= 0; i--) {
            r = mod(mul(r, r), modulus)
            if (getBit(exp, i)) r = mod(mul(r, b), modulus)
        }
        return r
    }

    // base64/PEM 解析(与原实现一致, 只把输出从 BigInt 改为 hex 字符串)
    function b64Decode(b64) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        var out = [], bits = 0, val = 0
        for (var i = 0; i < b64.length; i++) {
            var c = b64.charAt(i)
            if (c === '=' || c === '\n' || c === '\r') continue
            var idx = chars.indexOf(c)
            if (idx < 0) continue
            val = (val << 6) | idx
            bits += 6
            if (bits >= 8) { bits -= 8; out.push((val >>> bits) & 0xff) }
        }
        return out
    }
    function parsePemRsa(pem) {
        var b64 = String(pem).replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
        var der = b64Decode(b64)
        function readLen(bytes, i) {
            var b = bytes[i]; i++
            var len
            if (b < 0x80) { len = b } else {
                var n = b & 0x7f; len = 0
                for (var k = 0; k < n; k++) { len = (len << 8) | bytes[i]; i++ }
            }
            return [len, i]
        }
        function readTlv(bytes, i) {
            var p = i + 1
            var r = readLen(bytes, p), p2 = r[1]
            return { start: p2, end: p2 + r[0], content: bytes.slice(p2, p2 + r[0]) }
        }
        var outer = readTlv(der, 0)
        var bitStr = readTlv(der, readTlv(der, outer.start).end)
        var rsaSeq = readTlv(bitStr.content, 1)
        var nTlv = readTlv(rsaSeq.content, 0)
        var eTlv = readTlv(rsaSeq.content, nTlv.end)
        function toHex(arr) {
            var s = ''
            for (var i = 0; i < arr.length; i++) { var h = arr[i].toString(16); if (h.length < 2) h = '0' + h; s += h }
            return s
        }
        var nHex = toHex(nTlv.content).replace(/^00/, '')
        var eHex = toHex(eTlv.content) || '010001'
        return { nHex: nHex, eHex: eHex }
    }

    function RSAKey(nBI, eBI) {
        this.n = nBI
        this.e = eBI
    }
    RSAKey.prototype.doPublic = function (x) {
        return BigInteger.fromLimbs(modPowLimbs(x.d, this.e.d, this.n.d))
    }

    function JSEncrypt() { this._key = null }
    JSEncrypt.prototype.setPublicKey = function (pem) {
        var pr = parsePemRsa(pem)
        this._key = new RSAKey(new BigInteger(pr.nHex, 16), new BigInteger(pr.eHex, 16))
    }
    JSEncrypt.prototype.getKey = function () { return this._key }

    return JSEncrypt
}


const $fetch = {
    async get(url, opts) {
        opts = opts || {}
        const r = await req(url, opts)
        return { data: r.data, headers: r.headers || {}, error: r.error }
    },
    async post(url, body, opts) {
        opts = opts || {}
        const r = await req(url, { method: 'POST', headers: opts.headers || {}, data: String(body) })
        return { data: r.data, headers: r.headers || {}, error: r.error }
    },
}
function argsify(s) { return typeof s === 'string' ? JSON.parse(s) : (s || {}) }
function jsonify(obj) { return JSON.stringify(obj) }
function $print(...args) { try { console.log('[yiys]', ...args) } catch (e) {} }
const $utils = {
    base64encode(s) {
        try { return Crypto.enc.Base64.stringify(Crypto.enc.Utf8.parse(String(s))) } catch (e) { return '' }
    },
    base64decode(s) {
        try { return Crypto.enc.Utf8.stringify(Crypto.enc.Base64.parse(String(s))) } catch (e) { return '' }
    },
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

// ============================================================
// 以下为原始 yiys.js 源码 (verbatim 保留)
// ============================================================
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

        return jsonify({
            list: list,
            meta: {
                vodName: data.vodName || '',
                vodPic: data.vodPic || '',
                vodActor: data.vodActor || '',
                vodContent: data.vodContent || '',
                vodYear: data.vodYear || '',
                vodArea: data.vodArea || '',
                vodLang: data.vodLang || '',
                vodRemarks: data.vodRemark || '',
                vodDirector: data.vodDirector || '',
                vodDuration: data.vodDuration || '',
            },
        })
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
// uzVideo 扩展接口实现（wrapper，调用原始函数）
// ============================================================

/**
 * 一级分类 (XPTV getConfig → TABS)
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

async function getSubclassList(args) {
    return JSON.stringify(new RepVideoSubclassList())
}

/**
 * 分类列表 (XPTV getCards)
 * args.url = 一级分类 type_id
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        var ext = jsonify({ id: String(args.url || ''), page: args.page || 1, filters: {} })
        var result = JSON.parse(await getCards(ext))
        var cards = result.list || []
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            vd.vod_id = (c.ext && c.ext.id) ? c.ext.id : String(c.vod_id || '')
            vd.vod_name = c.vod_name || ''
            vd.vod_pic = c.vod_pic || ''
            vd.vod_remarks = c.vod_remarks || ''
            list.push(vd)
        }
        backData.data = list
        if (result.pagecount) backData.total = parseInt(result.pagecount, 10) || 0
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

async function getSubclassVideoList(args) {
    return await getVideoList(args)
}

/**
 * 详情 (XPTV getTracks)
 * args.url = vod_id
 * vod_play_url: name$jsonExt#...$$$name$jsonExt#  (jsonExt={sourceCode,url})
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        var url = String(args.url || '')
        if (!url) {
            backData.error = '缺少视频ID'
            return JSON.stringify(backData)
        }
        var ext = jsonify({ vod_id: url })
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
                var epExt = t.ext || {}
                if (epExt.sourceCode && epExt.url) {
                    eps.push(epName + '$' + jsonify(epExt))
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
        var meta = result.meta || {}
        det.vod_name = meta.vodName || ''
        det.vod_pic = meta.vodPic || ''
        det.vod_actor = meta.vodActor || ''
        det.vod_content = meta.vodContent || ''
        det.vod_year = meta.vodYear || ''
        det.vod_area = meta.vodArea || ''
        det.vod_lang = meta.vodLang || ''
        det.vod_remarks = meta.vodRemarks || ''
        det.vod_director = meta.vodDirector || ''
        det.vod_state = [meta.vodArea, meta.vodLang, meta.vodYear].filter(function(x){ return x }).join('·')
        backData.data = det
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 播放地址 (XPTV getPlayinfo)
 * args.url = jsonify 的 {sourceCode, url}
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        var url = String(args.url || '')
        if (!url) {
            backData.error = '缺少播放URL'
            return JSON.stringify(backData)
        }
        var ext = argsify(url)
        var result = JSON.parse(await getPlayinfo(jsonify(ext)))
        var urls = result.urls || []
        if (urls.length > 0) {
            backData.data = urls[0]
            backData.headers = { 'User-Agent': UA }
        } else {
            backData.error = '未找到播放地址'
        }
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 搜索 (XPTV search)
 * args.searchWord / args.page
 */
async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        var ext = jsonify({ text: String(args.searchWord || ''), page: args.page || 1 })
        var result = JSON.parse(await search(ext))
        var cards = result.list || []
        var list = []
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i]
            var vd = new VideoDetail()
            vd.vod_id = (c.ext && c.ext.id) ? c.ext.id : String(c.vod_id || '')
            vd.vod_name = c.vod_name || ''
            vd.vod_pic = c.vod_pic || ''
            vd.vod_remarks = c.vod_remarks || ''
            list.push(vd)
        }
        backData.data = list
        if (result.pagecount) backData.total = parseInt(result.pagecount, 10) || 0
    } catch (e) {
        backData.error = e.toString()
    }
    return JSON.stringify(backData)
}
