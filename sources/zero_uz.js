// ignore
//@name:零度影視
//@version:1
//@webSite:http://zero.mitotv.com
//@remark:移植自 XPTV zero.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV zero.js
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

let headers = {
    'User-Agent': 'okhttp/4.12.0',
    client: 'app',
    deviceType: 'Android',
}

let appConfig = {
    ver: 20250511,
    title: '零度影視',
    site: 'http://zero.mitotv.com',
}

async function getConfig() {
    headers.deviceId = getDid()
    headers.token = await getTk()

    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(appConfig)
}

async function getTabs() {
    try {
        let list = []
        let url = appConfig.site + `/api/v1/app/screen/screenType`

        const { data } = await $fetch.post(
            url,
            {},
            {
                headers: headers,
            }
        )
        const tagList = argsify(data).data
        tagList.forEach((e) => {
            list.push({
                name: e.name,
                ext: {
                    id: e.id,
                },
            })
        })
        list.push({
            name: '修改排序',
            ext: {
                id: 'reorder',
            },
        })

        return list
    } catch (error) {
        $print(error)
    }
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext

    if (id === 'reorder') {
        if (page >= 2) return
        return jsonify({
            list: [
                {
                    vod_id: '熱門',
                    vod_name: '熱門',
                    vod_pic: '',
                    ext: {
                        id: 'HOT',
                        text: '熱門',
                        action: 'reorder',
                    },
                },
                {
                    vod_id: '最新',
                    vod_name: '最新',
                    vod_pic: '',
                    ext: {
                        id: 'NEWEST',
                        text: '最新',
                        action: 'reorder',
                    },
                },
                {
                    vod_id: '人氣',
                    vod_name: '人氣',
                    vod_pic: '',
                    ext: {
                        id: 'POPULARITY',
                        text: '人氣',
                        action: 'reorder',
                    },
                },
            ],
        })
    }

    const url = appConfig.site + `/api/v1/app/screen/screenMovie`
    const header = headers
    header['content-type'] = 'application/json'
    const body = {
        condition: {
            sreecnTypeEnum: $cache.get('zero-order') || 'NEWEST',
            typeId: id,
        },
        pageNum: page,
        pageSize: 40,
    }

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })

    argsify(data).data.records.forEach((e) => {
        cards.push({
            vod_id: e.id,
            vod_name: e.name,
            vod_pic: e.cover,
            vod_remarks: `更新至 ${e.totalEpisode}`,
            ext: {
                id: e.id,
                typeId: id,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let list = []
    let { id, typeId } = ext

    if (ext.action === 'reorder') {
        $cache.set('zero-order', ext.id)
        $utils.toastInfo(`排序已修改為: ${ext.text}`)
        return
    }

    // get playerList
    const url = appConfig.site + `/api/v1/app/play/movieDetails`
    const header = headers
    header['content-type'] = 'application/json'
    const body = {
        id: id,
        typeId: typeId,
    }

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })

    let players = argsify(data).data.moviePlayerList.map((e) => ({
        name: e.moviePlayerName,
        id: e.id,
    }))

    // get all playUrl

    list = await getList()

    return jsonify({
        list: list,
    })

    async function getList() {
        const results = await Promise.all(
            players.map(async (player) => {
                const tracks = await getEpisodeByPlayer(player)
                return {
                    title: player.name,
                    tracks,
                }
            })
        )
        return results
    }

    async function getEpisodeByPlayer(player) {
        let tracks = []
        const body = {
            id: id,
            typeId: typeId,
            playerId: player.id.toString(),
        }

        const { data } = await $fetch.post(url, jsonify(body), {
            headers: header,
        })

        let playlist = argsify(data).data.episodeList
        playlist.forEach((e) => {
            const name = e.episode

            const payload = { ...body, episodeId: e.id.toString() }
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    body: payload,
                },
            })
        })

        return tracks
    }
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let body = ext.body

    const url = appConfig.site + `/api/v1/app/play/movieDetails`
    const header = headers
    header['content-type'] = 'application/json'

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })
    const playerUrl = argsify(data).data.url
    const { data: data2 } = await $fetch.get(appConfig.site + `/api/v1/app/play/analysisMovieUrl?playerUrl=${playerUrl}&playerId=${body.playerId}`, {
        headers: header,
    })
    const playUrl = argsify(data2).data

    return jsonify({ urls: [playUrl], headers: [headers] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const page = ext.page || 1
    const url = `${appConfig.site}/api/v1/app/search/searchMovie`
    let body = {
        condition: {
            value: ext.text,
        },
        pageNum: page,
        pageSize: 40,
    }

    const header = headers
    header['content-type'] = 'application/json'

    const { data } = await $fetch.post(url, jsonify(body), {
        headers: header,
    })

    argsify(data).data.records.forEach((e) => {
        cards.push({
            vod_id: e.id,
            vod_name: e.name,
            vod_pic: e.cover,
            // vod_remarks: `更新至 ${e.totalEpisode}`,
            ext: {
                id: e.id,
                typeId: e.typeId,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

function getDid() {
    let did = $cache.get('zero-did')

    if (!did) {
        const hexChars = '0123456789abcdef'
        did = Array.from({ length: 16 }, () => hexChars[Math.floor(Math.random() * 16)]).join('')

        $cache.set('zero-did', did)
    }

    return did
}

async function getTk() {
    const { data } = await $fetch.get(`${appConfig.site}/api/v1/app/user/visitorInfo`, {
        headers: headers,
    })

    return argsify(data).data.token
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
