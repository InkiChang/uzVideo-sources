// ignore
//@name:catflix
//@version:1
//@webSite:https://catflix.su
//@remark:移植自 XPTV catflix.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV catflix.js
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
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'catflix',
    site: 'https://catflix.su',
    tabs: [
        {
            name: 'Movies',
            ext: {
                id: 'movies',
            },
        },
        {
            name: 'Series',
            ext: {
                id: 'series',
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
    const url = `${appConfig.site}/wp-json/wp/v2/results?taxonomy=none&genre=none&terms=none&term=none&type=${id}&sort=1&page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/' + id,
        },
    })

    const html = argsify(data).data.html
    try {
        const $ = cheerio.load(html)

        $('article').each((_, e) => {
            const name = $(e).find('h2').text()
            const href = $(e).find('a.absolute').attr('href')
            const cover = $(e).find('img.aspect-poster').attr('src')

            cards.push({
                vod_id: href,
                vod_name: name.trim(),
                vod_pic: cover,
                vod_remarks: '',
                ext: {
                    url: href,
                },
            })
        })
    } catch (error) {
        $print(error)
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let url = ext.url

    if (url.includes('/movies/')) {
        return jsonify({
            list: [
                {
                    title: '默认分组',
                    tracks: [
                        {
                            name: 'Watch now',
                            pan: '',
                            ext: {
                                url: url,
                            },
                        },
                    ],
                },
            ],
        })
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let groups = []
    const season = $('main > section').eq(0).find('header li')
    season.each((i, e) => {
        const title = $(e).find('button').text()
        const eps = $('main > section').eq(0).find('div.grid').eq(i).find('article')
        let tracks = []
        eps.each((_, e) => {
            const name = $(e).find('header span').text().trim()
            const title = $(e).find('header h2').text().trim()
            const href = $(e).find('a.absolute').attr('href')
            tracks.push({
                name: `${name} ${title}`,
                pan: '',
                ext: {
                    url: href,
                },
            })
        })

        groups.push({
            title: title,
            tracks,
        })
    })

    return jsonify({
        list: groups,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        const embed = $('main article iframe').attr('src')

        const { data: html } = await $fetch.get(embed, {
            headers: {
                'User-Agent': UA,
                Referer: url,
            },
        })

        const apkey = html.match(/const apkey = "(.*?)";/)[1]
        const xxid = html.match(/const xxid\s+= "(.*?)";/)[1]

        const juice_key_url = 'https://turbovid.eu/api/cucked/juice_key'
        const juiceRes = await $fetch.get(juice_key_url, {
            headers: {
                'User-Agent': UA,
                Referer: url,
            },
        })
        const juice = argsify(juiceRes.data).juice

        const the_juice = 'https://turbovid.eu/api/cucked/the_juice/?' + apkey + '=' + xxid
        const thejuiceRes = await $fetch.get(the_juice, {
            headers: {
                'User-Agent': UA,
                Referer: url,
            },
        })

        const decrypted = decryptHexWithKey(argsify(thejuiceRes.data).data, juice)

        return jsonify({
            urls: [decrypted],
            headers: [
                {
                    'User-Agent': UA,
                    Referer: 'https://turbovid.eu/',
                },
            ],
        })
    } catch (error) {
        $print(error)
    }

    function decryptHexWithKey(_0x9f7cac, _0x3addad) {
        const _0x1cd6ea = hexToBinary(_0x9f7cac),
            _0x4dbc3d = _0x3addad
        return xorDecrypt(_0x1cd6ea, _0x4dbc3d)
    }

    function hexToBinary(_0x16357a) {
        let _0x5e6f37 = ''
        for (let _0x4b0e7b = 0; _0x4b0e7b < _0x16357a.length; _0x4b0e7b += 2) {
            _0x5e6f37 += String.fromCharCode(parseInt(_0x16357a.substr(_0x4b0e7b, 2), 16))
        }
        return _0x5e6f37
    }
    function xorDecrypt(_0x579416, _0x18f53d) {
        let _0x38888c = ''
        for (let _0x3e7254 = 0; _0x3e7254 < _0x579416.length; _0x3e7254++) {
            _0x38888c += String.fromCharCode(_0x579416.charCodeAt(_0x3e7254) ^ _0x18f53d.charCodeAt(_0x3e7254 % _0x18f53d.length))
        }
        return _0x38888c
    }
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/?s=${text}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('main ul li').each((_, e) => {
        const name = $(e).find('h2').text()
        const href = $(e).find('a.absolute').attr('href')
        const cover = $(e).find('img').attr('src')

        cards.push({
            vod_id: href,
            vod_name: name.trim(),
            vod_pic: cover,
            vod_remarks: '',
            ext: {
                url: href,
            },
        })
    })

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
