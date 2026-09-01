// ignore
//@name:aowu
//@version:1
//@webSite:https://www.aowu.tv
//@remark:移植自 XPTV aowu.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV aowu.js
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

async function getLocalInfo(ext) {
    return jsonify({
        ver: 20240413,
        name: 'aowu',
        site: 'https://www.aowu.tv'
    });
}

const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 20240413,
    title: 'aowu',
    site: 'https://www.aowu.tv',
    tabs: [
        {
            name: '新番',
            ext: {
                type: 20,
            },
        },
        {
            name: '番剧',
            ext: {
                type: 21,
            },
        },
        {
            name: '剧场',
            ext: {
                type: 22,
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

    const url = 'https://www.aowu.tv/index.php/ds_api/vod'
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
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: pic,
            vod_remarks: remarks || '',
            ext: {
                url: appConfig.site + e.url,
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
    let url = ext.url

    // 先请求页面，可能返回 cookie 验证
    let resp = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    
    let data = resp.data
    
    // 检查是否需要 cookie 验证
    if (data.includes('fl_js_validator') && data.includes('document.cookie')) {
        // 从响应中提取 cookie
        let cookieMatch = data.match(/document\.cookie\s*=\s*"([^"]+)"/)
        if (cookieMatch) {
            let cookieStr = cookieMatch[1]
            // 添加随机参数避免缓存
            let sep = url.includes('?') ? '&' : '?'
            let noCacheUrl = url + sep + '_t=' + Date.now()
            // 带上 cookie 重新请求
            resp = await $fetch.get(noCacheUrl, {
                headers: {
                    'User-Agent': UA,
                    'Cookie': cookieStr,
                },
            })
            data = resp.data
        }
    }
    
    // 检查是否是 JSON 字符串形式的 HTML
    if (typeof data === 'string' && data.startsWith('"') && data.endsWith('"')) {
        try {
            data = JSON.parse(data)
        } catch (e) {
            // 如果解析失败，保持原样
        }
    }

    const $ = cheerio.load(data)

    try {
        let from = []
        $('.anthology-tab .swiper-slide').each((i, e) => {
            let name = $(e).clone().children('i, span').remove().end().text().trim()
            let count = $(e).find('.badge').text().trim()
            from.push(`${name}(${count})`)
        })

        $('.anthology-list-box').each((i, e) => {
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
    } catch (error) {
        $print(error)
    }

    return jsonify({
        list: list,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url

    // 先请求页面，可能返回 cookie 验证
    let resp = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    
    let data = resp.data
    
    // 检查是否需要 cookie 验证
    if (data.includes('fl_js_validator') && data.includes('document.cookie')) {
        // 从响应中提取 cookie
        let cookieMatch = data.match(/document\.cookie\s*=\s*"([^"]+)"/)
        if (cookieMatch) {
            let cookieStr = cookieMatch[1]
            // 添加随机参数避免缓存
            let sep = url.includes('?') ? '&' : '?'
            let noCacheUrl = url + sep + '_t=' + Date.now()
            // 带上 cookie 重新请求
            resp = await $fetch.get(noCacheUrl, {
                headers: {
                    'User-Agent': UA,
                    'Cookie': cookieStr,
                },
            })
            data = resp.data
        }
    }
    
    // 检查是否是 JSON 字符串形式的 HTML
    if (typeof data === 'string' && data.startsWith('"') && data.endsWith('"')) {
        try {
            data = JSON.parse(data)
        } catch (e) {
            // 如果解析失败，保持原样
        }
    }

    try {
        const $ = cheerio.load(data)
        const config = JSON.parse($('script:contains(player_)').html().replace('var player_aaaa=', ''))
        let purl = config.url
        if (config.encrypt == 2) purl = unescape(base64Decode(purl))
        const artPlayer = appConfig.site + `/player/?url=${purl}`
        
        // 请求播放器页面，也需要处理 cookie 验证
        let artResp = await $fetch.get(artPlayer, {
            headers: {
                'User-Agent': UA,
                Referer: url,
            },
        })
        
        let artRes = artResp.data
        
        // 检查播放器页面是否需要 cookie 验证
        if (artRes && artRes.includes('fl_js_validator') && artRes.includes('document.cookie')) {
            let cookieMatch = artRes.match(/document\.cookie\s*=\s*"([^"]+)"/)
            if (cookieMatch) {
                let cookieStr = cookieMatch[1]
                let sep = artPlayer.includes('?') ? '&' : '?'
                let noCacheUrl = artPlayer + sep + '_t=' + Date.now()
                artResp = await $fetch.get(noCacheUrl, {
                    headers: {
                        'User-Agent': UA,
                        'Cookie': cookieStr,
                        Referer: url,
                    },
                })
                artRes = artResp.data
            }
        }

        if (artRes) {
            function decryptAES(ciphertext, key) {
                try {
                    const rawData = CryptoJS.enc.Base64.parse(ciphertext)
                    const iv = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 4))
                    const encrypted = CryptoJS.lib.WordArray.create(rawData.words.slice(4))
                    const decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted }, CryptoJS.enc.Utf8.parse(key), {
                        iv: iv,
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7,
                    })
                    return decrypted.toString(CryptoJS.enc.Utf8)
                } catch (e) {
                    $print(e)
                    return null
                }
            }
            
            let sessionKeyMatch = artRes.match(/const sessionKey\s=\s"([^"]+)"/)
            let encryptedUrlMatch = artRes.match(/const encryptedUrl\s=\s"([^"]+)"/)
            
            if (sessionKeyMatch && encryptedUrlMatch) {
                const sessionKey = sessionKeyMatch[1]
                const encryptedUrl = encryptedUrlMatch[1]
                const realUrl = decryptAES(encryptedUrl, sessionKey)
                return jsonify({ urls: [realUrl] })
            }
        }
    } catch (error) {
        $print(error)
    }

    return jsonify({ urls: [] })
}

async function search(ext) {
    try {
        ext = argsify(ext)
        let cards = []
        let text = encodeURIComponent(ext.text || ext.wd || '')
        let page = ext.page || 1
        
        // 使用正确的搜索URL
        let url = `https://www.aowu.tv/vods/?wd=${text}`
        if (page > 1) {
            url += `&page=${page}`
        }
        
        let resp = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })
        
        let data = resp.data
        
        // 检查是否需要 cookie 验证
        if (data.includes('fl_js_validator') && data.includes('document.cookie')) {
            let cookieMatch = data.match(/document\.cookie\s*=\s*"([^"]+)"/)
            if (cookieMatch) {
                let cookieStr = cookieMatch[1]
                let sep = url.includes('?') ? '&' : '?'
                let noCacheUrl = url + '&_t=' + Date.now()
                resp = await $fetch.get(noCacheUrl, {
                    headers: {
                        'User-Agent': UA,
                        'Cookie': cookieStr,
                    },
                })
                data = resp.data
            }
        }
        
        // 检查是否是 JSON 字符串形式的 HTML
        if (typeof data === 'string' && data.startsWith('"') && data.endsWith('"')) {
            try {
                data = JSON.parse(data)
            } catch (e) {}
        }
        
        const $ = cheerio.load(data)
        
        // 解析搜索结果
        $('.public-list-box, .module-item, .vod-detail').each((_, element) => {
            const href = $(element).find('a').attr('href')
            const title = $(element).find('img').attr('alt') || $(element).find('.title, .name, h3, .thumb-txt').text()
            const cover = $(element).find('img').attr('data-src') || $(element).find('img').attr('src')
            const remarks = $(element).find('.public-list-prb, .remarks, .score, .tag').text()
            
            if (href && title) {
                cards.push({
                    vod_id: href,
                    vod_name: title.trim(),
                    vod_pic: cover || '',
                    vod_remarks: remarks ? remarks.trim() : '',
                    ext: {
                        url: appConfig.site + href,
                    },
                })
            }
        })
        
        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
        return jsonify({list: []})
    }
}

function generatePHPSESSID() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const length = 26
    let sessionId = ''

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        sessionId += characters[randomIndex]
    }

    return sessionId
}

function md5(text) {
    return CryptoJS.MD5(text).toString()
}

function base64Decode(text) {
    return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(text))
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
