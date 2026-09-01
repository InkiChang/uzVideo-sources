// ignore
//@name:hkdoll
//@version:1
//@webSite:https://hongkongdollvideo.com
//@remark:移植自 XPTV hkdoll.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV hkdoll.js
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

const cheerio = createCheerio();
const CryptoJS = createCryptoJS();

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let appConfig = {
    ver: 20260224,
    title: 'hkdoll',
    site: 'https://hongkongdollvideo.com',
};

async function getConfig() {
    let config = appConfig;
    config.tabs = await getTabs();
    return jsonify(config)
}

async function getTabs() {
    let list = [];
    let ignore = ['亚洲成人视频'];
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    });
    const $ = cheerio.load(data);

    let allClass = $('.scrollbar a');
    allClass.each((_, e) => {
        const name = $(e).text();
        const href = $(e).attr('href');
        const isIgnore = isIgnoreClassName(name);
        if (isIgnore) return

        list.push({
            name,
            ext: {
                url: encodeURI(href),
            },
        });
    });

    return list
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { page = 1, url } = ext;

    if (page > 1) {
        url = url + page + '.html';
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    const $ = cheerio.load(data);

    $('.video-item').each((_, element) => {
        const href = $(element).find('.thumb a').attr('href');
        const title = $(element).find('.thumb a').attr('title');
        const cover = $(element).find('.thumb img').attr('data-src');
        const subTitle = $(element).find('.duratio').text().trim();
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
            },
        });
    });

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext);
    let tracks = [];
    let url = ext.url;

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    try {
        const $ = cheerio.load(data);
        const param = $('script:contains(__PAGE__PARAMS__)').text().split('var __PAGE__PARAMS__="')[1].split('"')[0];

        let pageLoader = decode(param);
        let embedUrl = pageLoader.player.embedUrl;
        let playUrl = getPlayUrl(embedUrl);

        tracks.push({
            name: '播放',
            pan: '',
            ext: {
                url: playUrl,
            },
        });
    } catch (error) {
        $print(error);
    }

    function decode(_0x558b38) {
        let key = _0x558b38.slice(-32);
        let encrypedConf = _0x558b38.substring(0, _0x558b38.length - 32);
        let pageConfig = JSON.parse(xorDec(encrypedConf, key));

        return pageConfig
    }
    function xorDec(_0x3b697f, _0x37f8e7) {
        let _0x2bec78 = '';
        const _0x1f8156 = _0x37f8e7.length;
        for (let _0x4b08c8 = 0; _0x4b08c8 < _0x3b697f.length; _0x4b08c8 += 2) {
            const _0x312f0e = _0x3b697f.substr(_0x4b08c8, 2),
                _0x33eb88 = String.fromCharCode(parseInt(_0x312f0e, 16)),
                _0x323ef5 = _0x37f8e7[(_0x4b08c8 / 2) % _0x1f8156];
            _0x2bec78 += String.fromCharCode(_0x33eb88.charCodeAt(0) ^ _0x323ef5.charCodeAt(0));
        }
        return _0x2bec78
    }

    function getPlayUrl(embedUrl) {
        let _0x1e8df = embedUrl.split('?token=')[1];
        let _0x1df1c5 = _0x1e8df.slice(-10);
        let _0x2c272d = md5(_0x1df1c5).slice(8, 24).split('').reverse().join('');
        let _0x32366e = _0x1e8df.slice(0, -10);

        var _0x4951c4 = {};
        let _0x4049bd = _0x535536(_0x32366e, _0x2c272d);
        _0x4951c4 = JSON.parse(_0x4049bd);
        return _0x4951c4.stream
    }
    function md5(_0x1e8df) {
        return CryptoJS.MD5(_0x1e8df).toString()
    }
    function _0x535536(_0x12d383, _0x391fc7) {
        let _0x8ccc83 = '';
        let _0x451061 = _0x391fc7.length;
        for (let _0x373381 = 0; _0x373381 < _0x12d383.length; _0x373381 += 2) {
            let _0x2de3e5 = (_0x373381 / 2) % _0x451061;
            let _0x386dd5 = parseInt(_0x12d383[_0x373381] + _0x12d383[_0x373381 + 1], 16);
            _0x8ccc83 += String.fromCharCode(_0x386dd5 ^ _0x391fc7.charCodeAt(_0x2de3e5));
        }
        return _0x8ccc83
    }

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
    ext = argsify(ext);
    const url = ext.url;
    const headers = {
        'User-Agent': UA,
        Referer: appConfig.site + '/',
    };

    return jsonify({ urls: [url], headers: [headers] })
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];

    let text = encodeURIComponent(ext.text);
    let page = ext.page || 1;
    let url = `${appConfig.site}/search/${text}/${page}.html`;

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    });

    const $ = cheerio.load(data);

    $('.video-item').each((_, element) => {
        const href = $(element).find('.thumb a').attr('href');
        const title = $(element).find('.thumb a').attr('title');
        const cover = $(element).find('.thumb img').attr('data-src');
        const subTitle = $(element).find('.duratio').text().trim();
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href,
            },
        });
    });

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
