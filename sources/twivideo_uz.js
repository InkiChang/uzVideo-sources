// ignore
//@name:twivideo
//@version:1
//@webSite:https://twivideo.net
//@remark:移植自 XPTV twivideo.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV twivideo.js
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

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
let viewToken = ''
const cheerio = createCheerio()

let appConfig = {
    ver: 20260724,
    title: 'twivideo',
    site: 'https://twivideo.net',
    tabs: [
        {
            name: '新着DL',
            ext: {
                type: '0',
                order: 'post_date',
                ty: 'p4',
            },
        },
        {
            name: 'ランキング (24時間)',
            ext: {
                type: 'ranking',
                order: '24',
                ty: 'p6',
            },
        },
        {
            name: 'ランキング (3日間)',
            ext: {
                type: 'ranking',
                order: '72',
                ty: 'p6',
            },
        },
        {
            name: 'ランキング (1週間)',
            ext: {
                type: 'ranking',
                order: '168',
                ty: 'p6',
            },
        },
        {
            name: '急上昇',
            ext: {
                type: 'trending',
                order: 'r_count',
                ty: 'p7',
            },
        },
        {
            name: '高評価',
            ext: {
                type: 'likeranking',
                order: '24',
                ty: 'p6',
            },
        },
    ],
}

async function getConfig() {
    await get_view_token()
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { type, order, ty, page = 1 } = ext

    try {
        const url = `${appConfig.site}/templates/view_lists.php`

        let offset = (page - 1) * 50
        const { data } = await $fetch.post(
            url,
            {
                offset: offset,
                limit: 50,
                tag: 'null',
                type: type,
                order: order,
                le: 1000,
                ty: ty,
                offset_int: offset,
                view_token: viewToken,
            },
            {
                headers: {
                    'User-Agent': UA,
                    Referer: appConfig.site + '/',
                },
            },
        )

        const $ = cheerio.load(data)

        let list = $('div.art_li')

        list.each((_, e) => {
            let img = $(e).find('.item_image img').attr('src')
            let url = $(e).find('.item_link').attr('href')
            cards.push({
                vod_id: url,
                // vod_name: $(e).find('.item_link').attr('data-id'),
                vod_name: '',
                vod_pic: img,
                ext: {
                    id: url,
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}

async function getTracks(ext) {
    ext = argsify(ext)

    let id = ext.id
    let tracks = [
        {
            name: '播放',
            pan: '',
            ext: {
                id,
            },
        },
    ]

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks: tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let { id } = ext

    return jsonify({ urls: [appConfig.site + id], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/templates/ajax_twitteroauth_v2.php`

    const { data } = await $fetch.post(
        url,
        {
            url: text,
        },
        {
            headers: {
                'User-Agent': UA,
                Referer: appConfig.site + '/',
            },
        },
    )

    const $ = cheerio.load(data)

    cards.push({
        vod_id: $(e).find('.item_link').attr('href'),
        vod_name: $(e).find('.item_link').attr('data-id'),
        vod_pic: $('img').attr('src'),
        ext: {
            id: $(e).find('.item_link').attr('href'),
        },
    })

    return jsonify({
        list: cards,
    })
}

async function get_view_token() {
    const resp = await $fetch.post(
        'https://twivideo.net/templates/ajax_view_token.php',
        {},
        {
            headers: {
                'User-Agent': UA,
                Referer: appConfig.site + '/?ranking',
            },
        },
    )
    const data = resp.data
    const json = argsify(data)
    if (json && json.ok && json.token) {
        viewToken = json.token
    }
    return
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
