// ignore
//@name:小紅
//@version:1
//@webSite:https://www.xiaohys.com
//@remark:移植自 XPTV xiaohys.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV xiaohys.js
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

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 20240413,
    title: '小紅',
    site: 'https://www.xiaohys.com',
    tabs: [
        {
            name: '電影',
            ext: {
                type: 1,
            },
        },
        {
            name: '電視劇',
            ext: {
                type: 2,
            },
        },
        {
            name: '綜藝',
            ext: {
                type: 3,
            },
        },
        {
            name: '動漫',
            ext: {
                type: 4,
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
    let { type, page = 1 } = ext

    const url = appConfig.site + '/index.php/api/vod'
    const time = Math.round(new Date() / 1000)
    const key = md5('DS' + time + 'DCC147D11943AF75')
    const body = {
        type: type,
        class: '',
        area: '',
        lang: '',
        version: '',
        state: '',
        letter: '',
        page: page,
        time: time,
        key: key,
    }

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const cardList = argsify(data).list
    cardList.forEach((e) => {
        let name = e.vod_name
        let pic = e.vod_pic
        let remarks = e.vod_remarks
        let id = e.vod_id
        cards.push({
            vod_id: `${id}`,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remarks,
            ext: {
                id: `${id}`,
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
    let id = ext.id
    let url = appConfig.site + `/detail/${id}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    let from = []
    $('.anthology-tab .swiper-wrapper a').each((i, e) => {
        let name = $(e).text().trim()
        let eps = $(e).find('span').text()

        from.push(`${name.replace(eps, '')} (${eps})`)
    })

    $('.anthology-list .anthology-list-box').each((i, e) => {
        const play_from = from[i]
        let videos = $(e).find('li a')
        let tracks = []
        videos.each((i, e) => {
            const name = $(e).text()
            const href = $(e).attr('href')
            tracks.push({
                name: name,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        })
        list.push({
            title: play_from,
            tracks,
        })
    })

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    let playerUrl
    try {
        ext = argsify(ext)
        const url = ext.url

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        const config = JSON.parse($('script:contains(player_aaaa)').html().replace('var player_aaaa=', ''))
        let purl = config.url
        if (purl.endsWith('.m3u8')) {
            playerUrl = purl
        } else if (purl.includes('jx.xiaohys')) {
            let pres = await $fetch.get(purl, {
                headers: {
                    'User-Agent': UA,
                },
            })
            let player = pres.data.match(/var player = "(.*?)"/)[1]
            let rand = pres.data.match(/var rand = "(.*?)"/)[1]

            let config = cryptJs(player, 'VFBTzdujpR9FWBhe', rand)
            playerUrl = argsify(config).url
        } else {
            let api = await $fetch.post(
                appConfig.site + '/static/player/artplayer/api.php?ac=getdate',
                {
                    url: purl,
                    referer: url,
                },
                {
                    headers: {
                        'User-Agent': UA,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            )
            let data = argsify(api.data).data
            let iv = argsify(api.data).iv
            let key = md5('www.xiaohys.com').slice(0, 16)

            // function aes(text, iv) {
            //     const key = CryptoJS.enc.Utf8.parse('d978a93ffb4d3a00')

            //     const decrypted = CryptoJS.AES.decrypt(text, key, {
            //         iv: CryptoJS.enc.Utf8.parse(iv),
            //         mode: CryptoJS.mode.CBC,
            //         padding: CryptoJS.pad.Pkcs7,
            //     })

            //     return decrypted.toString(CryptoJS.enc.Utf8)
            // }
            let config = cryptJs(data, key, iv)
            playerUrl = argsify(config).videoUrl
        }
    } catch (error) {
        $print(error)
    }

    function cryptJs(text, key, iv, type) {
        var type = type || false
        var key = CryptoJS.enc.Utf8.parse(key || 'PBfAUnTdMjNDe6pL')
        var iv = CryptoJS.enc.Utf8.parse(iv || 'sENS6bVbwSfvnXrj')
        if (type) {
            var content = CryptoJS.AES.encrypt(text, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            })
        } else {
            var content = CryptoJS.AES.decrypt(text, key, { iv: iv, padding: CryptoJS.pad.Pkcs7 }).toString(
                CryptoJS.enc.Utf8
            )
        }
        return content
    }

    return jsonify({ urls: [playerUrl], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1
        // if (page > 1) {
        //     return jsonify({
        //         list: cards,
        //     })
        // }

        let url = appConfig.site + `/search${text}/page/${page}/`
        let searchRes = await $fetch.get(url, {
            headers: {
                'user-agent': UA,
            },
        })
        let html = searchRes.data

        const $ = cheerio.load(html)

        $('.search-box').each((_, element) => {
            const href = $(element).find('.left .public-list-exp').attr('href')
            const title = $(element).find('.thumb-content .thumb-txt').text().trim()
            const cover = $(element).find('.left img').attr('data-src')
            const subTitle = $(element).find('.left .public-list-prb').text()
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    id: href.match(/detail\/(.+)/)[1],
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

function md5(text) {
    return CryptoJS.MD5(text).toString()
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
