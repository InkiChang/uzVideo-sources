// ignore
//@name:小雅tvbox
//@version:1
//@webSite:
//@remark:移植自 XPTV alist_tvbox.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV alist_tvbox.js
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

// 填入自建的地址 (http://your-ip:port)
let custom = ''

let appConfig = {
    ver: 20241009,
    title: '小雅tvbox',
}

if (custom) {
    $cache.set('alist_tvbox_host', custom)
}

let UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

async function getConfig() {
    let config = appConfig
    let host = $cache.get('alist_tvbox_host')
    // let host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    }
    if (!host) {
        host = 'undefined'
        config.site = host
        config.tabs = [
            {
                name: '未配置站點',
                ext: {
                    url: host,
                },
            },
        ]
    } else {
        config.site = host
        config.tabs = await getTabs(host)
    }

    return jsonify(config)
}

async function getTabs(host) {
    let list = []

    let url = host + '/vod1'

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    let allClass = argsify(data).class
    allClass.forEach((e) => {
        if (e.type_flag === 1) return
        list.push({
            name: e.type_name,
            ext: {
                url: url + `?t=${e.type_id}`,
            },
        })
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { url, page = 1 } = ext

    if (url === 'undefined') {
        cards = [
            {
                vod_id: '-1',
                vod_name: '請在自定義配置中填入url',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    url: '',
                },
            },
            {
                vod_id: '-1',
                vod_name: '確保JSON格式正確',
                vod_pic: '',
                vod_remarks: '',
                ext: {
                    url: '',
                },
            },
        ]
    } else {
        let host = $cache.get('alist_tvbox_host')
        // let host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        if (typeof $config_str !== 'undefined') {
            host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        }

        let url = ext.url + `&pg=${page}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        argsify(data).list.forEach((e) => {
            cards.push({
                vod_id: e.vod_id,
                vod_name: e.vod_name,
                vod_pic: e.vod_pic,
                vod_remarks: e.vod_remarks,
                ext: {
                    url: `${host}/vod1?ids=${e.vod_id}`,
                },
            })
        })
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url
    let host = $cache.get('alist_tvbox_host')
    // let host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const vod_play_url = argsify(data).list[0].vod_play_url
    const seasons = vod_play_url.split('$$$')
    seasons.forEach((e) => {
        const eps = e.split('#')
        eps.forEach((e) => {
            const [name, url] = e.split('$')
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: `${host}/play?id=${url || name}&from=open`,
                },
            })
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

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'X-client': 'com.fongmi.android.tv',
        },
    })

    let playUrl = argsify(data).url

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    if (ext.text.startsWith('tvbox:')) {
        function isValid(input) {
            const regex = /^https?:\/\/[^\s\/:]+(:\d+)?$/
            return regex.test(input)
        }
        ext.text = ext.text.replace('tvbox:', '')
        let host = ext.text
        if (isValid(host)) {
            $cache.set('alist_tvbox_host', host)
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '已添加站點，重新進入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        url: '',
                    },
                },
            ]
        } else {
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '無效的URL，請重新輸入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        url: '',
                    },
                },
            ]
        }
    } else {
        const text = encodeURIComponent(ext.text)
        let host = $cache.get('alist_tvbox_host')
        // const host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        if (typeof $config_str !== 'undefined') {
            host = argsify($config_str)?.url || $cache.get('alist_tvbox_host')
        }

        const url = `${host}/vod1?wd=${text}`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        argsify(data).list.forEach((e) => {
            const id = e.vod_id
            cards.push({
                vod_id: id,
                vod_name: e.vod_name,
                vod_pic: e.vod_pic,
                vod_remarks: e.vod_remarks,
                ext: {
                    url: `${host}/vod1?ids=${id}`,
                },
            })
        })
    }

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
