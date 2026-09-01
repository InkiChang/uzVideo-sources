// ignore
//@name:多多影音
//@version:1
//@webSite:https://tv.yydsys.top
//@remark:移植自 XPTV yydsys.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV yydsys.js
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
// const CryptoJS = createCryptoJS()
// const JSEncrypt = loadJSEncrypt()
/*
以上是可以調用的第三方庫，使用方法自行查閱文檔
內置方法有:
$print: 等同於 console.log
$fetch: http client，可發送 get 及 post 請求
    get: $fetch.get(url,options)
    post: $fetch.post(url,postData,options)
argsify, jsonify: 等同於 JSON 的 parse 及 stringify
$html: 內置的 html 解析方法，建議用 cheerio 替代
$cache: 可將數據存入緩存
    set: $cache.set(key, value)
    get: $cache.get(key)
*/

// 預先定義請求使用的 user-agent
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const appConfig = {
    ver: 1,
    title: '多多影音',
    site: 'https://tv.yydsys.top',
    // 定義分類
    tabs: [
        // name 為分類名，ext 可以傳入任意參數由 getCards 接收
        {
            name: '電影',
            ext: {
                id: 1,
            },
        },
        {
            name: '劇集',
            ext: {
                id: 2,
            },
        },
        {
            name: '短劇',
            ext: {
                id: 5,
            },
        },
        {
            name: '動漫',
            ext: {
                id: 4,
            },
        },
        {
            name: '綜藝',
            ext: {
                id: 3,
            },
        },
        {
            name: '紀錄',
            ext: {
                id: 20,
            },
        },
    ],
}

// 進入源時調用，ver,title,site,tabs 為必須項
async function getConfig() {
    return jsonify(appConfig)
}

// 取得分類的影片列表，ext 為 tabs 定義的 ext 加上頁碼(page)
async function getCards(ext) {
    // 將 JSON 字符串轉為 JS 對象
    ext = argsify(ext)
    // 定義一個空的卡片數組
    let cards = []
    // 從 ext 中解構賦值取出頁數及分類 id，等同於:
    // let page = ext.page
    // let id = ext.id
    let { page = 1, id } = ext

    // 定義請求的 URL
    const url = appConfig.site + `/index.php/vod/show/id/${id}/page/${page}.html`

    // 使用內置的 http client 發起請求獲取 html
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    // 用 cheerio 解析 html
    const $ = cheerio.load(data)

    // 用 css 選擇器選出影片列表
    const videos = $('#main .module-item')
    // 遍歷所有影片
    videos.each((_, e) => {
        const href = $(e).find('.module-item-pic a').attr('href')
        const title = $(e).find('.module-item-pic img').attr('alt')
        const cover = $(e).find('.module-item-pic img').attr('data-src')
        const remarks = $(e).find('.module-item-text').text()
        // 將每個影片加入 cards 數組中
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks, // 海報右上角的子標題
            // ext 會傳給 getTracks
            ext: {
                url: `${appConfig.site}${href}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

// 取得播放列表
async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const playlist = $('.module-player-list .module-row-one')
    playlist.each((_, e) => {
        const name = $(e).find('.module-row-title h4').text().replace('- 公众号《多多影音》', '')
        // 網盤的分享連結
        const panShareUrl = $(e).find('.module-row-title p').text()
        tracks.push({
            name: name.trim(),
            pan: panShareUrl,
        })
    })

    return jsonify({
        // list 返回一個數組，用於區分不同線路(參考 AGE 動漫及 girigiri 動漫)，但功能未實現目前只會讀取第一項
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

// 網盤源不需要寫播放
async function getPlayinfo(ext) {
    return jsonify({ urls: [] })
}

// search 的寫法跟 getCards 一樣，唯一不同就是由分類 id 改為關鍵字
async function search(ext) {
    ext = argsify(ext)
    let cards = []

    // 必須把中文編碼否則 iOS 16 會報錯
    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/index.php/vod/search/page/${page}/wd/${text}.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    const videos = $('#main .module-search-item')
    videos.each((_, e) => {
        const href = $(e).find('.video-info-header h3 a').attr('href')
        const title = $(e).find('.module-item-pic img').attr('alt')
        const cover = $(e).find('.module-item-pic img').attr('data-src')
        const remarks = $(e).find('.video-serial').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: remarks,
            ext: {
                url: `${appConfig.site}${href}`,
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
