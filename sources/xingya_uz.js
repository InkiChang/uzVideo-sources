// ignore
//@name:星芽短劇
//@version:1
//@webSite:https://app.whjzjx.cn
//@remark:移植自 XPTV xingya.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV xingya.js
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

// xingya

const CryptoJS = createCryptoJS()

let appConfig = {
    ver: 1,
    title: '星芽短劇',
    site: 'https://app.whjzjx.cn',
    tabs: [
        {
            name: '热播剧',
            ext: {
                id: 2,
            },
        },
        {
            name: '会员专享',
            ext: {
                id: 8,
            },
        },
        {
            name: '星选好剧',
            ext: {
                id: 7,
            },
        },
        {
            name: '新剧',
            ext: {
                id: 3,
            },
        },
        {
            name: '阳光剧场',
            ext: {
                id: 5,
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
    let url = `${appConfig.site}/cloud/v2/theater/home_page?theater_class_id=${id}&type=1&page_num=${page}&page_size=24`
    let headers = await getHeader()

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    let list = argsify(data).data.list
    list.forEach((e) => {
        let item = e.theater
        let id = item.id.toString()
        cards.push({
            vod_id: id,
            vod_name: item.title,
            vod_pic: item.cover_url,
            vod_remarks: `${item.total}集全`,
            ext: {
                id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let id = ext.id
    let url = `${appConfig.site}/v2/theater_parent/detail?theater_parent_id=${id}`
    let headers = await getHeader()

    const { data } = await $fetch.get(url, {
        headers: headers,
    })

    let playlist = argsify(data).data.theaters
    playlist.forEach((e) => {
        let name = e.num.toString()
        let url = e.son_video_url
        tracks.push({
            name,
            pan: '',
            ext: {
                url,
            },
        })
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

    return jsonify({ urls: [url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let url = appConfig.site + '/v3/search'
    let headers = await getHeader()
    headers['Content-Type'] = 'application/json'
    let body = {
        text: encodeURIComponent(text),
    }

    // const { data } = await axios.post(url, body, {
    //     headers: headers,
    // })
    const { data } = await $fetch.post(url, body, {
        headers: headers,
    })

    const list = argsify(data).data.theater.search_data

    list.forEach((e) => {
        let item = e
        let id = item.id.toString()
        cards.push({
            vod_id: id,
            vod_name: item.title,
            vod_pic: item.cover_url,
            vod_remarks: `${item.total}集全`,
            ext: {
                id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getHeader() {
    let header = {
        'User-Agent': 'okhttp/4.10.0',
        'Accept-Encoding': 'gzip',
        'x-app-id': '7',
        platform: '1',
        manufacturer: 'asus',
        version_name: '3.3.1',
        user_agent:
            'Mozilla/5.0 (Linux; Android 14; Zenfone 5Z Build/AP2A.240705.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36',
        dev_token:
            'Bsg4gWzOoQc9UEvsnDHZWNlpphiWxQ9MIDNUZIqU6k_irRIWCyYEABtuSI5OBkJ9gDNLzcr1wBQSku05JgYmeQN-lmGn94m-On-JSrqecxcFQdU8VkskVkugV4qUF_mW1sHjcYWeXbfdHM5b2VytKSUCRzlJ-Ix4QuRrll15Rmxo*',
        app_version: '3.3.1',
        device_platform: 'android',
        personalized_recommend_status: '1',
        device_type: 'Zenfone+5Z',
        device_brand: 'asus',
        os_version: '14',
        channel: 'default',
        raw_channel: 'default',
        oaid: '',
        msa_oaid: '',
        uuid: 'randomUUID_9e91d3ce-8658-4d6e-9d1b-6f351611163d',
        device_id: '2885ce2d34c9634b287ab022f2f3a6cfb',
        ab_id: '',
        support_h265: '1',
    }

    let token = $cache.get('xingya')
    // $print(`token: ${token}`)

    if (token) {
        let currentTime = Math.floor(Date.now() / 1000)
        let exp = decodeJWT(token).payload.exp
        if (currentTime > exp) {
            token = ''
        }
    }

    if (!token) {
        token = await getJWT(header)
        $cache.set('xingya', token)
    }

    header['authorization'] = token
    return header
}

async function getJWT(header) {
    const login = `https://u.shytkjgs.com/user/v1/account/login`
    let headers = header
    headers['Content-Type'] = 'application/x-www-form-urlencoded'

    const { data } = await $fetch.post(
        login,
        { device: headers.device_id },
        {
            headers: headers,
        }
    )
    const jwt = argsify(data).data.token
    // $print(`jwt: ${jwt}`)
    return jwt
}

function decodeJWT(token) {
    function base64UrlDecode(str) {
        // Replace URL-safe characters with Base64 characters
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
        // Add padding if necessary
        while (base64.length % 4) {
            base64 += '='
        }
        // Decode Base64 string
        return base64Decode(base64)
    }

    // Split JWT into parts
    const parts = token.split('.')
    if (parts.length !== 3) {
        throw new Error('Invalid JWT token')
    }

    // Decode header and payload
    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = JSON.parse(base64UrlDecode(parts[1]))

    return {
        header: header,
        payload: payload,
        signature: parts[2],
    }
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
