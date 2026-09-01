// ignore
//@name:愛壹帆
//@version:1
//@webSite:https://m10.iyf.tv
//@remark:移植自 XPTV iyftv.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV iyftv.js
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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.3'

let appConfig = {
    ver: 1,
    title: '愛壹帆',
    site: 'https://m10.iyf.tv',
    tabs: [
        {
            name: '电影',
            ext: {
                id: '3',
            },
        },
        {
            name: '电视',
            ext: {
                id: '4',
            },
        },
        {
            name: '综艺',
            ext: {
                id: '5',
            },
        },
        {
            name: '动漫',
            ext: {
                id: '6',
            },
        },
        {
            name: '短剧',
            ext: {
                id: '4,155',
            },
        },
        {
            name: '体育',
            ext: {
                id: '95',
            },
        },
        {
            name: '纪录片',
            ext: {
                id: '7',
            },
        },
    ],
}

async function getConfig() {
    await updateKeys()
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let keys = $cache.get('iyf-keys')
    const publicKey = JSON.parse(keys).publicKey
    let cards = []
    let { id, page = 1 } = ext

    let url = `${appConfig.site}/api/list/Search?cinema=1&page=${page}&size=36&orderby=0&desc=1&cid=0,1,${id}&isserial=-1&isIndex=-1&isfree=-1`
    let params = url.split('?')[1]
    url += `&vv=${getSignature(params)}&pub=${publicKey}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    let list = argsify(data).data.info[0].result

    list.forEach((e) => {
        cards.push({
            vod_id: e.key,
            vod_name: e.title,
            vod_pic: e.image,
            vod_remarks: e.cid,
            ext: {
                key: e.key,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const publicKey = JSON.parse($cache.get('iyf-keys')).publicKey
    let tracks = []
    let key = ext.key

    let url = `${appConfig.site}/v3/video/languagesplaylist?cinema=1&vid=${key}&lsk=1&taxis=0&cid=0,1,4,133`
    let params = url.split('?')[1]
    url += `&vv=${getSignature(params)}&pub=${publicKey}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let playlist = argsify(data).data.info[0].playList
    playlist.forEach((e) => {
        const name = e.name
        const key = e.key
        tracks.push({
            name: name,
            pan: '',
            ext: {
                key: key,
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
    const publicKey = JSON.parse($cache.get('iyf-keys')).publicKey
    let key = ext.key
    let url = `${appConfig.site}/v3/video/play?cinema=1&id=${key}&a=0&lang=none&usersign=1&region=GL.&device=1&isMasterSupport=1`
    let params = url.split('?')[1]
    url += `&vv=${getSignature(params)}&pub=${publicKey}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let paths = argsify(data).data.info[0].flvPathList
    let playUrl = ''
    paths.forEach(async (e) => {
        if (e.isHls) {
            let link = e.result
            link += `?vv=${getSignature('')}&pub=${publicKey}`
            playUrl = link
        }
    })

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `https://rankv21.iyf.tv/v3/list/briefsearch?tags=${text}&orderby=4&page=${page}&size=10&desc=0&isserial=-1&istitle=true`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let list = argsify(data).data.info[0].result
    list.forEach((e) => {
        cards.push({
            vod_id: e.contxt,
            vod_name: e.title,
            vod_pic: e.imgPath,
            vod_remarks: e.cid,
            ext: {
                key: e.contxt,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function updateKeys() {
    let baseUrl = 'https://www.iyf.tv'
    let { data } = await $fetch.get(baseUrl, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    let script = $('script:contains(injectJson)').text()
    script.split('\n').forEach((e) => {
        if (e.includes('injectJson')) {
            let json = JSON.parse(e.replace('var injectJson =', '').replace(';', ''))
            let publicKey = json['config'][0]['pConfig']['publicKey']
            let privateKey = json['config'][0]['pConfig']['privateKey']
            let keys = {
                publicKey: publicKey,
                privateKey: privateKey,
            }
            const jsonData = JSON.stringify(keys, null, 2)

            $cache.set('iyf-keys', jsonData)
        }
    })
}

function getSignature(query) {
    const publicKey = JSON.parse($cache.get('iyf-keys')).publicKey
    const privateKey = getPrivateKey()
    const input = publicKey + '&' + query.toLowerCase() + '&' + privateKey

    return CryptoJS.MD5(CryptoJS.enc.Utf8.parse(input)).toString()
}

function getPrivateKey() {
    const privateKey = JSON.parse($cache.get('iyf-keys')).privateKey
    const timePublicKeyIndex = Date.now()

    return privateKey[timePublicKeyIndex % privateKey.length]
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
