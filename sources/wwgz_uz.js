// ignore
//@name:农民影视
//@version:1
//@webSite:https://vip.wwgz.cn:5200
//@remark:移植自 XPTV wwgz.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV wwgz.js
// 转换工具: tools/convert_xptv.py
// 原理: XPTV兼容shim + uzVideo wrapper
// ============================================================

// ---------- XPTV 兼容层 (polyfill) ----------

const $$cheerio = createCheerio();
const $$crypto = createCryptoJS();

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

// createCheerio/createCryptoJS 由 uzVideo 运行时提供，不在此定义

// loadJSEncrypt - XPTV runtime, uzVideo may not provide
function loadJSEncrypt() {
    return {
        setPublicKey(k) { this._pub = k; },
        setPrivateKey(k) { this._priv = k; },
        encrypt(t) { return t; },
        decrypt(t) { return t; },
    };
}

// $config_str - XPTV runtime config variable (usually empty in uzVideo context)
const $config_str = '';

// ---------- 原始 XPTV 代码 ----------

const cheerio = createCheerio()

const UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 20260224,
    title: '农民影视',
    site: 'https://vip.wwgz.cn:5200',
    tabs: [
        {
            name: '电影',
            ext: {
                id: '1',
            },
        },
        {
            name: '连续剧',
            ext: {
                id: '2',
            },
        },
        {
            name: '综艺',
            ext: {
                id: '3',
            },
        },
        {
            name: '动漫',
            ext: {
                id: '4',
            },
        },
        {
            name: '短剧',
            ext: {
                id: '26',
            },
        },
    ],
}

const filterList = {
    1: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '1' },
                { n: '动作片', v: '5' },
                { n: '喜剧片', v: '6' },
                { n: '爱情片', v: '7' },
                { n: '科幻片', v: '8' },
                { n: '恐怖片', v: '9' },
                { n: '剧情片', v: '10' },
                { n: '战争片', v: '11' },
                { n: '惊悚片', v: '12' },
                { n: '奇幻片', v: '13' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
                { n: '2009~2000', v: '2009~2000' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
    2: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '2' },
                { n: '国产剧', v: '12' },
                { n: '港台泰', v: '13' },
                { n: '日韩剧', v: '14' },
                { n: '欧美剧', v: '15' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
    3: [
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
    4: [
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
}

async function getConfig() {
    let config = appConfig
    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    let url = `${appConfig.site}/vod-list-id-${ext?.filters?.type || id}-pg-${page}-order--by-${ext?.filters?.sort || 'time'}-class-0-year-${ext?.filters?.year || 0}-letter--area-${ext?.filters?.area || ''}-lang-.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.globalPicList > ul li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('a').attr('title')
        const cover = $(element).find('img').attr('src')
        const subTitle = $(element).find('.sDes').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
        filter: filterList[id] || [],
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let lists = []
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    // 從第一集取出 track list
    const href = $('.numList').first().find('li').first().find('a').attr('href')
    const firstEpUrl = appConfig.site + href

    const { data: epData } = await $fetch.get(firstEpUrl, {
        headers: {
            'User-Agent': UA,
        },
    })

    const mac_from = epData?.match(/mac_from\s*=\s*'([^']*)'/)[1]
    const mac_url = epData?.match(/mac_url\s*=\s*'([^']+)'/)[1]

    const from = mac_from.split('$$$')
    const urls = mac_url.split('$$$')

    for (let i = 0; i < from.length; i++) {
        let temp = {
            title: from[i],
            tracks: [],
        }
        let eps = urls[i].split('#')
        for (let j = 0; j < eps.length; j++) {
            let ep = eps[j].split('$')
            temp.tracks.push({
                name: from.length == 1 ? `${from[i]}-${ep[0]}` : ep[0],
                pan: '',
                ext: {
                    url: ep[1],
                },
            })
        }
        lists.push(temp)
    }

    return jsonify({
        list: lists,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = `https://api.nmvod.me:520/player/?url=${ext.url}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'iframe',
        },
    })

    const match = data.match(/var\s+config\s*=\s*(\{[\s\S]*?\})/)
    const configString = match?.[1]
    const playUrl = configString.match(/url":\s*"(.+)"/)?.[1]

    return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/index.php?m=vod-search`
    if (page > 1) return jsonify({ list: [] })
    let body = `wd=${text}`

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const $ = cheerio.load(data)

    $('#search_main ul li').each((_, element) => {
        const href = $(element).find('.pic a').attr('href')
        const title = $(element).find('.sTit').text()
        const cover = $(element).find('img').attr('data-src')
        const subTitle = $(element).find('.sStyle').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
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
            backData.data = {
                url: parsed.urls[0],
                header: parsed.headers || {},
            };
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
