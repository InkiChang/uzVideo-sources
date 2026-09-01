// ignore
//@name:fmovies
//@version:1
//@webSite:https://fmovies.llc
//@remark:移植自 XPTV fmovies.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV fmovies.js
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
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: 'fmovies',
    site: 'https://fmovies.llc',
    tabs: [
        {
            name: 'movies',
            ext: {
                url: 'https://fmovies.llc/movie',
            },
        },
        {
            name: 'tv-shows',
            ext: {
                url: 'https://fmovies.llc/tv-show',
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
    let { page = 1, url } = ext
    url = url + `?page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.film_list-wrap > div.flw-item').each((_, e) => {
        const href = $(e).find('.film-poster-ahref').attr('href')
        const title = $(e).find('.film-poster-ahref').attr('title')
        const cover = $(e).find('.film-poster-img').attr('data-src')
        const remarks = $(e).find('.film-poster-quality').text() || ''
        // const subTitle = $(element).find('.label').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            // vod_duration: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
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
    let groups = []
    let url = ext.url

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        const movie = {
            id: $('.watch_block').attr('data-id') || '',
            type: $('.watch_block').attr('data-type') || '',
        }

        if (movie.type == '2') {
            // tv show

            // get season list
            const listRes = await $fetch.get(`${appConfig.site}/ajax/season/list/${movie.id}`, {
                headers: {
                    'User-Agent': UA,
                    'X-Requested-With': 'XMLHttpRequest',
                    Referer: url,
                },
            })
            const $list = cheerio.load(listRes.data)
            const seasons = $list('.sl-title a.ss-item').toArray()
            const seasonInfo = seasons.map((e) => ({
                title: $list(e).text().trim(),
                id: $list(e).attr('data-id'),
            }))

            // get episodes
            for (const { title, id: seasonId } of seasonInfo) {
                let epUrl = `${appConfig.site}/ajax/season/episodes/${seasonId}`
                const { data } = await $fetch.get(epUrl, {
                    headers: {
                        'User-Agent': UA,
                        'X-Requested-With': 'XMLHttpRequest',
                        Referer: url,
                    },
                })

                const $ = cheerio.load(data)
                const eps = $('li')
                const group = {
                    title: title,
                    tracks: [],
                }

                eps.each((_, el) => {
                    const name = $(el).find('a').attr('title')
                    const id = $(el).find('a').attr('data-id')
                    group.tracks.push({
                        name,
                        pan: '',
                        ext: { id: id, type: 'ep' },
                    })
                })

                groups.push(group)
            }
        } else {
            // movie
            let mgroup = {
                title: 'server',
                tracks: [],
            }

            // get server
            let serverUrl = `${appConfig.site}/ajax/episode/list/${movie.id}`
            const serverRes = await $fetch.get(serverUrl, {
                headers: {
                    'User-Agent': UA,
                    'X-Requested-With': 'XMLHttpRequest',
                    Referer: url,
                },
            })
            const $server = cheerio.load(serverRes.data)
            const servers = $server('.server-select ul li a')
            servers.each((_, el) => {
                const name = $server(el).text().trim()
                const id = $server(el).attr('data-linkid').trim()
                mgroup.tracks.push({
                    name,
                    pan: '',
                    ext: { id: id, type: 'server' },
                })
            })
            groups.push(mgroup)
        }
    } catch (error) {
        $print(jsonify(error))
    }

    return jsonify({
        list: groups,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const { id, type } = ext

    let playId, playUrl, referer

    try {
        if (type == 'ep') {
            let server = []
            let url = `${appConfig.site}/ajax/episode/servers/${id}`
            const { data } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
            let $ = cheerio.load(data)
            const servers = $('.server-select ul li a')
            servers.each((_, el) => {
                const name = $(el).text().trim()
                const id = $(el).attr('data-id').trim()
                server.push({
                    name,
                    id,
                })
            })

            const randomIndex = Math.floor(Math.random() * server.length)
            playId = server[randomIndex].id
            $utils.toastInfo(`Using ${server[randomIndex].name}...`)
        } else {
            playId = id
        }

        const { data } = await $fetch.get(`${appConfig.site}/ajax/episode/sources/${playId}`, {
            headers: {
                'User-Agent': UA,
                'X-Requested-With': 'XMLHttpRequest',
            },
        })

        const json = argsify(data)
        const iframe = json.link
        const { data: iframeData } = await $fetch.get(iframe, {
            headers: {
                'User-Agent': UA,
                Referer: appConfig.site,
            },
        })

        // get file id nonce
        const $ = cheerio.load(iframeData)
        let fileId = $('[id$="-player"]').attr('data-id')
        let nonce = extractNonce(iframeData)

        let parseURL = new URL(iframe)
        const parse = await $fetch.get(
            `https://${parseURL.hostname}/embed-1/v3/e-1/getSources?id=${fileId}&_k=${nonce}`,
            {
                headers: {
                    'User-Agent': UA,
                    'X-Requested-With': 'XMLHttpRequest',
                    Referer: appConfig.site,
                },
            }
        )
        const parseJSON = argsify(parse.data)
        if (parseJSON.encrypted) {
        } else {
            playUrl = parseJSON.sources[0].file
            referer = `https://${parseURL.hostname}/`
        }
    } catch (error) {
        $print(error)
    }

    function extractNonce(r) {
        const m =
            r.match(/\b[a-zA-Z0-9]{48}\b/) ||
            r.match(/\b([a-zA-Z0-9]{16})\b.?\b([a-zA-Z0-9]{16})\b.?\b([a-zA-Z0-9]{16})\b/)
        return m ? (m.length === 4 ? m.slice(1).join('') : m[0]) : null
    }

    return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA, Referer: referer }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/search/${text}?page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.film_list-wrap > div.flw-item').each((_, e) => {
        const href = $(e).find('.film-poster-ahref').attr('href')
        const title = $(e).find('.film-poster-ahref').attr('title')
        const cover = $(e).find('.film-poster-img').attr('data-src')
        const remarks = $(e).find('.film-poster-quality').text() || ''
        // const subTitle = $(element).find('.label').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            // vod_duration: subTitle,
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

function URL(url) {
    this.href = url

    var m = url.match(/^([a-zA-Z]+:)?\/\/([^\/?#:]+)?(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/)
    this.protocol = m[1] || ''
    this.hostname = m[2] || ''
    this.port = m[3] ? m[3].slice(1) : ''
    this.pathname = m[4] || ''
    this.search = m[5] || ''
    this.hash = m[6] || ''
    this.host = this.port ? this.hostname + ':' + this.port : this.hostname
    this.origin = this.protocol + '//' + this.host

    // searchParams
    var params = {}
    if (this.search.length > 1) {
        this.search
            .substring(1)
            .split('&')
            .forEach(function (pair) {
                var parts = pair.split('=')
                var key = decodeURIComponent(parts[0])
                var value = decodeURIComponent(parts[1] || '')
                params[key] = value
            })
    }

    this.searchParams = {
        get: function (key) {
            return params[key] || null
        },
        has: function (key) {
            return key in params
        },
        entries: function () {
            return Object.entries(params)
        },
        keys: function () {
            return Object.keys(params)
        },
        values: function () {
            return Object.values(params)
        },
        toString: function () {
            return Object.entries(params)
                .map(function (kv) {
                    return encodeURIComponent(kv[0]) + '=' + encodeURIComponent(kv[1])
                })
                .join('&')
        },
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
