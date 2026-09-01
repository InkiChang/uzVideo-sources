// ignore
//@name:JAVDB
//@version:1
//@webSite:https://vod.infiniteapi.com
//@remark:移植自 XPTV javdb_vod_xptv.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV javdb_vod_xptv.js
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

const UA = 'Dart/3.3'

let appConfig = {
    ver: 20250507,
    title: 'JAVDB',
    site: 'https://vod.infiniteapi.com',
}

async function getConfig() {
    let config = appConfig
    let token = argsify($config_str).token
    if (!token) {
        $utils.toastInfo('one為biu提供的付費源，請填入token再使用')
        return
    }
    config.tabs = await getTabs(token)
    return jsonify(config)
}

async function getTabs(token) {
    try {
        let list = []
        let url = appConfig.site + `/${token}/javdb_vod`

        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })
        
        // 使用字符串处理方式解析 XML
        const tyMatches = data.match(/<ty id="(.*?)">(.*?)<\/ty>/g) || []
        
        for (const tyXml of tyMatches) {
            const idMatch = tyXml.match(/id="(.*?)"/)
            const titleMatch = tyXml.match(/>([^<]+)</)
            
            if (idMatch && titleMatch) {
                list.push({
                    name: titleMatch[1],
                    ext: {
                        url: `${appConfig.site}/${token}/javdb_vod?t=${idMatch[1]}&ac=videolist`,
                        token: `${token}`,
                    },
                })
            }
        }

        return list
    } catch (error) {
        $print(error)
    }
}

async function getCards(ext) {
    try {
        ext = argsify(ext)
        let cards = []
        let url = ext.url
        let page = ext.page || 1
        url = `${url}&pg=${page}`
        let token = ext.token


        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        // 使用字符串处理方式解析 XML
        const videoMatches = data.match(/<video>([\s\S]*?)<\/video>/g) || []
        
        for (const videoXml of videoMatches) {
            const nameMatch = videoXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)
            const picMatch = videoXml.match(/<pic>(.*?)<\/pic>/)
            const idMatch = videoXml.match(/<id>(.*?)<\/id>/)
            
            cards.push({
                vod_id: idMatch ? idMatch[1] : "",
                vod_name: nameMatch ? nameMatch[1] : "",
                vod_pic: picMatch ? picMatch[1] : "",
                ext: {
                    url: `${appConfig.site}/${token}/javdb_vod?ids=${idMatch[1]}`,
                },
            })
        }

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
        let url = ext.url
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        // 使用字符串处理方式解析 XML
        const ddMatches = data.match(/<dd flag="">\s*<!\[CDATA\[(.*?)\]\]>\s*<\/dd>/g) || []
        
        for (const ddXml of ddMatches) {
            const contentMatch = ddXml.match(/<!\[CDATA\[(.*?)\]\]>/)
            if (contentMatch) {
                const [title, playUrl] = contentMatch[1].split('$$')
                tracks.push({
                    name: title,
                    pan: '',
                    ext: {
                        url: playUrl,
                    },
                })
            }
        }

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
        const url = ext.url
        return jsonify({ urls: [url] })
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []

        let token = argsify($config_str).token
        let text = encodeURIComponent(ext.text)
        let page = ext.page || 1
        if (page >= 2) return

        const url = appConfig.site + `/${token}/javdb_vod?ac=videolist&wd=${text}`
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        // 使用字符串处理方式解析 XML
        const videoMatches = data.match(/<video>([\s\S]*?)<\/video>/g) || []
        
        for (const videoXml of videoMatches) {
            const nameMatch = videoXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)
            const picMatch = videoXml.match(/<pic>(.*?)<\/pic>/)
            const idMatch = videoXml.match(/<id>(.*?)<\/id>/)
            
            cards.push({
                vod_id: idMatch ? idMatch[1] : "",
                vod_name: nameMatch ? nameMatch[1] : "",
                vod_pic: picMatch ? picMatch[1] : "",
                ext: {
                    url: `${appConfig.site}/${token}/javdb_vod?ids=${idMatch[1]}`,
                },
            })
        }

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
