// ignore
//@name:在线之家
//@version:1
//@webSite:https://www.zxzjhd.com
//@remark:移植自 XPTV zxzj.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV zxzj.js
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
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const appConfig = {
    ver: 20251119,
    title: '在线之家',
    site: 'https://www.zxzjhd.com',
    tabs: [
        {
            name: '首页',
            ext: {
                id: 0,
            },
        },
        {
            name: '电影',
            ext: {
                id: 1,
            },
        },
        {
            name: '美剧',
            ext: {
                id: 2,
            },
        },
        {
            name: '韩剧',
            ext: {
                id: 3,
            },
        },
        {
            name: '日剧',
            ext: {
                id: 4,
            },
        },
        {
            name: '泰剧',
            ext: {
                id: 5,
            },
        },
        {
            name: '动漫',
            ext: {
                id: 6,
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    var cards = []
    let id = ext.id
    let page = ext.page || 1

    try {
        var url = `${appConfig.site}/`
        if (id == 0 && page > 1) {
            return jsonify({
                list: cards,
            })
        }

        if (id > 0) {
            url = `${appConfig.site}/list/${id}.html`
            if (page > 1) {
                url = `${appConfig.site}/list/${id}-${page}.html`
            }
        }

        const { data } = await $fetch.get(url, {
            headers: {
                // Referer: `${appConfig.site}/`,
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        $('.stui-vodlist__box').each((_, element) => {
            const href = $(element).find('.stui-vodlist__thumb').attr('href')
            const title = $(element).find('.stui-vodlist__thumb').attr('title')
            const cover = $(element).find('.stui-vodlist__thumb').attr('data-original')
            const subTitle = $(element).find('.pic-text').find('.text-right').text()

            if (href.startsWith('/detail/')) {
                cards.push({
                    vod_id: href.replace(/.*?\/detail\/(.*).html/g, '$1'),
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: subTitle,
                    ext: {
                        url: `${appConfig.site}${href}`,
                    },
                })
            }
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
    var tracks = []
    let url = ext.url

    // 发送请求
    const { data } = await $fetch.get(url, {
        headers: {
            // Referer: 'https://www.zxzja.com/',
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    // 解析数据，例如提取标题
    $('.stui-content__playlist > li > a').each((_, each) => {
        const href = $(each).attr('href')
        const name = $(each).text()
        if (href && name && name !== '合集') {
            tracks.push({
                name,
                pan: '',
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
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
    var plays = []
    let url = ext.url

    try {
        // 发送请求
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const html = data.match(/r player_.*?=(.*?)</)[1]
        const json = JSON.parse(html)

        const playurl = json.url
        const from = json.from
        if (json.encrypt == '1') {
            playurl = decodeURIComponent(url)
        } else if (json.encrypt == '2') {
            playurl = decodeURIComponent(Buffer.from(url, 'base64').toString('utf-8'))
        }
        $print(`playurl: ${playurl}`)
        if (playurl.indexOf('m3u8') >= 0 || playurl.indexOf('mp4') >= 0) {
            return jsonify({ urls: [playurl] })
            // } else if (from.indexOf('line3') >= 0 || from.indexOf('line5') >= 0) {
        } else {
            const { data } = await $fetch.get(playurl, {
                headers: {
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'zh-CN,zh;q=0.9',
                    Referer: `${appConfig.site}/`,
                    'Sec-Ch-Ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"macOS"',
                    'Sec-Fetch-Dest': 'iframe',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-site',
                    'Upgrade-Insecure-Requests': '1',
                    'User-Agent': UA,
                },
            })
            let resultv2 = data.match(/var result_v2 = {(.*?)};/)[1]
            let code = JSON.parse('{' + resultv2 + '}')
                .data.split('')
                .reverse()
            let temp = ''
            for (let i = 0x0; i < code.length; i = i + 0x2) {
                temp += String.fromCharCode(parseInt(code[i] + code[i + 0x1], 0x10))
            }
            const purl =
                temp.substring(0x0, (temp.length - 0x7) / 0x2) + temp.substring((temp.length - 0x7) / 0x2 + 0x7)
            $print('***在线之家purl =====>' + purl)
            return jsonify({ urls: [purl] })
        }
        return jsonify({ urls: [] })
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    ext = argsify(ext)
    var cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1

    if (page > 1) {
        return jsonify({
            list: cards,
        })
    }

    const url = `${appConfig.site}/vodsearch/-------------.html?wd=${text}&submit=`
    const { data } = await $fetch.get(url, {
        headers: {
            Referer: `${appConfig.site}`,
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    $('a.lazyload').each((_, element) => {
        const href = $(element).attr('href')
        const title = $(element).attr('title')
        const cover = $(element).attr('data-original')
        const subTitle = $(element).find('.text-right').text()

        if (href.startsWith('/detail/')) {
            cards.push({
                vod_id: href.replace(/.*?\/detail\/(.*).html/g, '$1'),
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: `${appConfig.site}${href}`,
                },
            })
        }
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
