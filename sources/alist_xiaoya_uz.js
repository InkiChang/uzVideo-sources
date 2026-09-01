// ignore
//@name:小雅原版
//@version:1
//@webSite:
//@remark:移植自 XPTV alist_xiaoya.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV alist_xiaoya.js
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

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

// 填入自建的地址 (http://your-ip:port)
let custom = ''
// 可選: 填入 alist 令牌 (alist-ff....)
let token = ''

if (custom) {
    $cache.set('alist_xiaoya_host', custom)
}
if (token) {
    $cache.set('alist_xiaoya_token', token)
}

let appConfig = {
    ver: 20241009,
    title: '小雅原版',
}

let defaultConfig = {
    tabs: [
        {
            name: '未配置站點',
            ext: {
                cat: 'undefined',
            },
        },
    ],
    cards: [
        {
            vod_id: '-1',
            vod_name: '請在自定義配置中填入小雅配置',
            vod_pic: '',
            vod_remarks: '',
            ext: {
                cat: '',
            },
        },
        {
            vod_id: '-1',
            vod_name: '確保JSON格式正確',
            vod_pic: '',
            vod_remarks: '',
            ext: {
                cat: '',
            },
        },
    ],
}

let xiaoyaTabs = [
    { name: '每日更新', ext: { cat: 'daily' } },
    { name: '国产剧', ext: { cat: 'tv.china' } },
    { name: '港台剧', ext: { cat: 'tv.hktw' } },
    { name: '韩剧', ext: { cat: 'tv.korea' } },
    { name: '美剧', ext: { cat: 'tv.us' } },
    { name: '英剧', ext: { cat: 'tv.uk' } },
    { name: '日剧', ext: { cat: 'tv.japan' } },
    { name: '国漫', ext: { cat: 'comics.china' } },
    { name: '日漫', ext: { cat: 'comics.japan' } },
    { name: '动漫', ext: { cat: 'comics' } },
    { name: '🎬中国', ext: { cat: 'movie.china' } },
    { name: '🎬豆瓣榜', ext: { cat: 'movie.top' } },
    { name: '🎬泰国', ext: { cat: 'movie.thai' } },
    { name: '🎬港台', ext: { cat: 'movie.hktw' } },
    { name: '🎬欧美', ext: { cat: 'movie.western' } },
    { name: '🎬日本', ext: { cat: 'movie.japan' } },
    { name: '🎬韩国', ext: { cat: 'movie.korea' } },
    { name: '🎬印度', ext: { cat: 'movie.india' } },
    { name: '🎬杜比', ext: { cat: 'movie.dolby' } },
    { name: '🎬4K REMUX', ext: { cat: 'movie.4kremux' } },
    { name: '纪录片.历史', ext: { cat: 'docu.history' } },
    { name: '纪录片.美食', ext: { cat: 'docu.food' } },
    { name: '纪录片.考古', ext: { cat: 'docu.archeology' } },
    { name: '纪录片.探索发现', ext: { cat: 'docu.explore' } },
    { name: '纪录片.国家地理', ext: { cat: 'docu.natgeo' } },
    { name: '纪录片.BBC', ext: { cat: 'docu.bbc' } },
    { name: '纪录片.NHK', ext: { cat: 'docu.nhk' } },
    { name: '百家讲坛', ext: { cat: 'docu.baijia' } },
    { name: '纪录片', ext: { cat: 'docu' } },
    { name: '儿童', ext: { cat: 'comics.child' } },
    { name: '音乐', ext: { cat: 'music' } },
    { name: '综艺', ext: { cat: 'reality' } },
]

async function getConfig() {
    let config = appConfig
    // 沒有填就回退舊版緩存的host，避免舊版使用者重新配置
    let host = $cache.get('alist_xiaoya_host')
    // let host = $config?.url || $cache.get('alist_xiaoya_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    }

    config.site = host
    config.tabs = xiaoyaTabs

    if (!host) {
        host = 'undefined'
        config.site = host
        config.tabs = defaultConfig.tabs
    }

    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { cat } = ext

    if (cat === 'undefined') {
        cards = defaultConfig.cards

        return jsonify({
            list: cards,
        })
    }

    let host = $cache.get('alist_xiaoya_host')
    // let host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    }
    let url = `${host}/whatsnew?num=200&type=video&filter=last&cat=${ext.cat}`
    const { data } = await $fetch.get(url)

    const $ = cheerio.load(data)
    const allVideos = $('body > div > ul > figure')
    allVideos.each((_, e) => {
        let path = $(e).find('figcaption > a').attr('href')
        let name = $(e).find('figcaption > a').text()
        let img = $(e).find('img').attr('src')
        let score = $(e).find('figcaption').text()
        path = path.replaceAll('%20', ' ')
        img = img.replace(/https?:\/\//, '')
        score = score.match(/豆瓣评分：\s*([\d.]+)/)?.[1] || ''

        cards.push({
            vod_id: path,
            vod_name: name,
            vod_pic: `${host}/image/${img}`,
            vod_remarks: score,
            ext: {
                path: path,
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
    let path = ext.path
    let host = $cache.get('alist_xiaoya_host')
    let token = $cache.get('alist_xiaoya_token')
    // let host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    // let token = argsify($config_str)?.token || $cache.get('alist_xiaoya_token')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
        token = argsify($config_str)?.token || $cache.get('alist_xiaoya_token')
    }
    let url = `${host}/api/fs/list`

    let headers = {
        'User-Agent': UA,
    }
    token && token.startsWith('alist-') ? (headers['Authorization'] = token) : $cache.set('alist_xiaoya_token', '')

    const { data } = await $fetch.post(url, { path: path }, { headers: headers })

    const content = argsify(data)?.data?.content
    const folder = []
    content.forEach((e) => {
        if (e.is_dir) folder.push(e.name)
        else if (e.type === 2) {
            tracks.push({
                name: e.name,
                pan: '',
                ext: {
                    path: `${path}/${e.name}`,
                },
            })
        }
    })
    if (folder.length) {
        for (const f of folder) {
            const { data: folderData } = await $fetch.post(
                url,
                {
                    path: `${path}/${f}`,
                },
                {
                    headers: {
                        Authorization: token,
                    },
                }
            )
            const folderContent = argsify(folderData).data.content
            folderContent.forEach((e) => {
                if (e.type === 2) {
                    tracks.push({
                        name: e.name,
                        pan: '',
                        ext: {
                            path: `${path}/${f}/${e.name}`,
                        },
                    })
                }
            })
        }
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
    ext = argsify(ext)
    let path = ext.path
    let token = $cache.get('alist_xiaoya_token')
    let host = $cache.get('alist_xiaoya_host')
    // let token = argsify($config_str)?.token || $cache.get('alist_xiaoya_token')
    // let host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
        token = argsify($config_str)?.token || $cache.get('alist_xiaoya_token')
    }

    let url = `${host}/api/fs/get`

    let headers = {
        'User-Agent': UA,
    }
    token && token.startsWith('alist-') ? (headers['Authorization'] = token) : $cache.set('alist_xiaoya_token', '')

    const { data } = await $fetch.post(url, { path: path }, { headers: headers })

    let playUrl = argsify(data).data.raw_url

    return jsonify({ urls: [playUrl] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    if (ext.text.startsWith('xiaoya:')) {
        function isValid(input) {
            const regex = /^https?:\/\/[^\s\/:]+(:\d+)?/
            return regex.test(input)
        }
        ext.text = ext.text.replace('xiaoya:', '')
        let parts = ext.text.split('@@@')
        let host = parts[0]
        if (isValid(host)) {
            $cache.set('alist_xiaoya_host', host)
            $cache.set('alist_xiaoya_token', '') // 每次輸入時同時清空 token
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '已添加站點，重新進入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        cat: '',
                    },
                },
            ]
        } else {
            cards = [
                {
                    vod_id: '-1',
                    vod_name: '無效的配置，請重新輸入',
                    vod_pic: '',
                    vod_remarks: '',
                    ext: {
                        cat: '',
                    },
                },
            ]
        }
        if (parts[1] && parts[1].startsWith('alist-')) {
            let token = parts[1]
            $cache.set('alist_xiaoya_token', token)
        }

        return jsonify({
            list: cards,
        })
    }

    const text = encodeURIComponent(ext.text)
    let host = $cache.get('alist_xiaoya_host')
    // const host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    if (typeof $config_str !== 'undefined') {
        host = argsify($config_str)?.url || $cache.get('alist_xiaoya_host')
    }
    const url = `${host}/sou?box=${text}&type=video&url=`

    const { data } = await $fetch.get(url)

    const $ = cheerio.load(data)
    const allVideos = $('body > div > ul > a')
    allVideos.each((_, e) => {
        const href = $(e).text()
        const [path, name, id, score, img] = href.split('#')
        cards.push({
            vod_id: id || path,
            vod_name: name || path,
            vod_pic: img || '',
            vod_remarks: score || '',
            ext: {
                path: path,
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
