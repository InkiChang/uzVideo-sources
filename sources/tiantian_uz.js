// ignore
//@name:天天影視
//@version:1
//@webSite:http://op.ysdqjs.cn
//@remark:移植自 XPTV tiantian.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV tiantian.js
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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.3'
let cookie = 'PHPSESSID=eebef1362fc5312a330b700fc4fafbd0'

let appConfig = {
    ver: 1,
    title: '天天影視',
    site: 'http://op.ysdqjs.cn',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['首页', '公告留言']
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    let url = appConfig.site + '/v2/type/top_type'
    let res = await postData(url)

    let types = argsify(res.data).data.list
    types.forEach((e) => {
        const name = e.type_name
        const id = e.type_id
        const isIgnore = isIgnoreClassName(name)
        if (isIgnore) return

        list.push({
            name,
            ext: {
                id: id.toString(),
            },
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    const limit = 12
    const param = {
        type_id: ext.id,
        page: ext.page || 1,
        limit: limit,
    }
    const url = appConfig.site + '/v2/home/type_search'

    let res = await postData(url, param)

    let list = argsify(res.data).data.list
    list.forEach((e) => {
        const id = e.vod_id.toString()
        cards.push({
            vod_id: id,
            vod_name: e.vod_name,
            vod_pic: e.vod_pic,
            vod_remarks: e.vod_remarks,
            ext: {
                id: id,
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
    const param = {
        vod_id: ext.id,
    }
    const url = appConfig.site + '/v2/home/vod_details'

    let res = await postData(url, param)
    let playlist = argsify(res.data).data.vod_play_list
    playlist.forEach((e) => {
        const videoInfo = e.urls
        const parse = e.parse_urls[0] || ''
        let from = e.flag
        let group = {
            title: from,
            tracks: [],
        }
        videoInfo.forEach((e) => {
            let ep = e.name
            let url = e.url
            if (parse) {
                url = parse + url
            }

            group.tracks.push({
                name: `${ep}`,
                pan: '',
                ext: {
                    url: url,
                },
            })
        })

        groups.push(group)
    })

    return jsonify({
        list: groups,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    let isParse = url.includes('url=')

    if (isParse) {
        let res = await request(url)
        let json = argsify(res.data)
        if (json.url) {
            return jsonify({ urls: [json.url] })
        }
        return jsonify({ urls: [url.split('url=')[1]] })
    }

    return jsonify({ urls: [url] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const limit = 12
    const param = {
        keyword: text,
        page: page,
        limit: limit,
    }
    const url = appConfig.site + '/v2/home/search'

    let res = await postData(url, param)

    let list = argsify(res.data).data.list
    list.forEach((e) => {
        const id = e.vod_id.toString()
        cards.push({
            vod_id: id,
            vod_name: e.vod_name,
            vod_pic: e.vod_pic,
            vod_remarks: e.vod_remarks,
            ext: {
                id: id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function postData(url, data) {
    const timestamp = Math.floor(new Date().getTime() / 1000)
    const key = 'kj5649ertj84ks89r4jh8s45hf84hjfds04k'
    const sign = CryptoJS.MD5(key + timestamp).toString()
    let defaultData = {
        sign: sign,
        timestamp: timestamp.toString(),
    }
    const reqData = data ? Object.assign({}, defaultData, data) : defaultData

    return request(url, 'post', reqData)
}

async function request(reqUrl, method, data) {
    const headers = {
        'User-Agent': UA,
    }

    if (cookie) {
        headers['Cookie'] = cookie
    }

    if (method === 'post') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        return $fetch.post(reqUrl, data, {
            headers: headers,
        })
    }

    return $fetch.get(reqUrl, {
        headers: headers,
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
