// ignore
//@name:加藤視頻
//@version:1
//@webSite:https://5jsd6q7.jnfkdtm.xyz/shorter
//@remark:移植自 XPTV jtapp.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV jtapp.js
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
const UA = 'Dart/3.3'

let appConfig = {
    ver: 20250507,
    title: '加藤視頻',
    site: 'https://5jsd6q7.jnfkdtm.xyz/shorter',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    try {
        let list = []
        let url = appConfig.site + '/tag/videotag/tagAndCategory'

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })
        const tagList = argsify(data).data.tagList
        tagList.forEach((e) => {
            const videoTagList = e.videoTagList
            videoTagList.forEach((e) => {
                list.push({
                    name: e.tagName,
                    ext: {
                        id: e.id.toString(),
                    },
                    ui: 1,
                })
            })
        })

        return list
    } catch (error) {
        $print(error)
    }
}

async function getCards(ext) {
    try {
        ext = argsify(ext)
        let cards = []
        let id = ext.id
        let page = ext.page || 1

        let url = appConfig.site + `/video/longvideoinfo/pageListByTag?pageNo=${page}&pageSize=20&idList=${id}&sortType=1`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let abcUrl = argsify(data).abcUrl
        let list = argsify(data).data.list
        list.forEach((e) => {
            cards.push({
                vod_id: e.id.toString(),
                vod_name: e.videoName,
                vod_pic: abcUrl + '/' + e.videoImagePreFs,
                vod_remarks: e.fNo || '',
                ext: {
                    id: e.id.toString(),
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
    try {
        ext = argsify(ext)
        let tracks = []
        let id = ext.id

        tracks.push({
            name: 'play',
            pan: '',
            ext: {
                id: id,
            },
        })

        return jsonify({
            list: [
                {
                    title: '在线',
                    tracks: tracks,
                },
            ],
        })
    } catch (error) {
        $print(error)
    }
}

async function getPlayinfo(ext) {
    try {
        ext = argsify(ext)
        const id = ext.id
        let url = appConfig.site + `/video/longvideoinfo/info?id=${id}`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        let cosUrl = argsify(data).data.cosUrl
        const videoImage = argsify(data).data.videoImage
        const videoUrlPre = argsify(data).data.videoUrlPre

        if (cosUrl.includes(',')) {
            cosUrl = cosUrl.split(',')[0]
        }

        if (argsify(data).data.isTrysee !== 1) {
            let trailerUrl = ''
            const folder = videoImage ? videoImage.split('/')[0] : ''

            if (videoUrlPre !== null) {
                trailerUrl = `${cosUrl}/${folder}/asy/trailer.m3u8`
            } else if (videoImage) {
                trailerUrl = `${cosUrl}/${folder}/asy/trailer.m3u8`
            }
            $print(trailerUrl)

            return jsonify({ urls: [trailerUrl] })
        } else {
            let path = videoUrlPre.replace(/\/[^\/]+\.\w+$/, '/trailer.m3u8')
            let trailerUrl = cosUrl + '/' + path
            $print(trailerUrl)

            return jsonify({ urls: [trailerUrl] })
        }
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1

        const url = appConfig.site + `/page/${page}/?s=${text}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        $('.bt_img.mi_ne_kd ul li').each((_, each) => {
            cards.push({
                vod_id: $(each).find('a').attr('href'),
                vod_name: $(each).find('h3.dytit a').text(),
                vod_pic: $(each).find('img').attr('src'),
                vod_remarks: $(each).find('.dytit .dycategory > a').text(),
                vod_duration: $(each).find('.dytit .dyplayinfo').text().trim(),
                ext: {
                    url: $(each).find('a').attr('href'),
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
