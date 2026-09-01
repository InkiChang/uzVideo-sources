// ignore
//@name:jianpian
//@version:1
//@webSite:https://ev5356.970xw.com
//@remark:移植自 XPTV jianpian.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV jianpian.js
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

let appConfig = {
    ver: 20260318,
    title: 'jianpian',
    // h5v2.cibnabg.com
    // site: 'https://ev5356.970xw.com',
    site: 'https://api.ztcgi.com',
    imgDomain: 'img.jgsfnl.com',
    tabs: [
        { name: '首頁', ext: { id: 'home' }, ui: 1 },
        { name: '電影', ext: { id: 1 } },
        { name: '電視劇', ext: { id: 2 } },
        { name: '動漫', ext: { id: 3 } },
        { name: '綜藝', ext: { id: 4 } },
        { name: '紀錄片', ext: { id: 50 } },
        { name: 'Netflix', ext: { id: 99 } },
    ],
}
let filterObj = {
    1: [
        {
            key: 'cateId',
            name: '分类',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '剧情' },
                { v: '2', n: '爱情' },
                { v: '3', n: '动画' },
                { v: '4', n: '喜剧' },
                { v: '5', n: '战争' },
                { v: '6', n: '歌舞' },
                { v: '7', n: '古装' },
                { v: '8', n: '奇幻' },
                { v: '9', n: '冒险' },
                { v: '10', n: '动作' },
                { v: '11', n: '科幻' },
                { v: '12', n: '悬疑' },
                { v: '13', n: '犯罪' },
                { v: '14', n: '家庭' },
                { v: '15', n: '传记' },
                { v: '16', n: '运动' },
                { v: '18', n: '惊悚' },
                { v: '20', n: '短片' },
                { v: '21', n: '历史' },
                { v: '22', n: '音乐' },
                { v: '23', n: '西部' },
                { v: '24', n: '武侠' },
                { v: '25', n: '恐怖' },
            ],
        },
        {
            key: 'area',
            name: '地區',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '国产' },
                { v: '3', n: '香港' },
                { v: '6', n: '台湾' },
                { v: '5', n: '美国' },
                { v: '18', n: '韩国' },
                { v: '2', n: '日本' },
            ],
        },
        {
            key: 'year',
            name: '年代',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '162', n: '2026' },
                { v: '107', n: '2025' },
                { v: '119', n: '2024' },
                { v: '153', n: '2023' },
                { v: '101', n: '2022' },
                { v: '118', n: '2021' },
                { v: '16', n: '2020' },
                { v: '7', n: '2019' },
                { v: '2', n: '2018' },
                { v: '3', n: '2017' },
                { v: '22', n: '2016' },
                { v: '2015', n: '2015以前' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            init: 'update',
            value: [
                { v: 'update', n: '最新' },
                { v: 'hot', n: '最热' },
                { v: 'rating', n: '评分' },
            ],
        },
    ],
    2: [
        {
            key: 'cateId',
            name: '分类',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '剧情' },
                { v: '2', n: '爱情' },
                { v: '3', n: '动画' },
                { v: '4', n: '喜剧' },
                { v: '5', n: '战争' },
                { v: '6', n: '歌舞' },
                { v: '7', n: '古装' },
                { v: '8', n: '奇幻' },
                { v: '9', n: '冒险' },
                { v: '10', n: '动作' },
                { v: '11', n: '科幻' },
                { v: '12', n: '悬疑' },
                { v: '13', n: '犯罪' },
                { v: '14', n: '家庭' },
                { v: '15', n: '传记' },
                { v: '16', n: '运动' },
                { v: '18', n: '惊悚' },
                { v: '20', n: '短片' },
                { v: '21', n: '历史' },
                { v: '22', n: '音乐' },
                { v: '23', n: '西部' },
                { v: '24', n: '武侠' },
                { v: '25', n: '恐怖' },
            ],
        },
        {
            key: 'area',
            name: '地區',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '国产' },
                { v: '3', n: '香港' },
                { v: '6', n: '台湾' },
                { v: '5', n: '美国' },
                { v: '18', n: '韩国' },
                { v: '2', n: '日本' },
            ],
        },
        {
            key: 'year',
            name: '年代',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '162', n: '2026' },
                { v: '107', n: '2025' },
                { v: '119', n: '2024' },
                { v: '153', n: '2023' },
                { v: '101', n: '2022' },
                { v: '118', n: '2021' },
                { v: '16', n: '2020' },
                { v: '7', n: '2019' },
                { v: '2', n: '2018' },
                { v: '3', n: '2017' },
                { v: '22', n: '2016' },
                { v: '2015', n: '2015以前' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            init: 'update',
            value: [
                { v: 'update', n: '最新' },
                { v: 'hot', n: '最热' },
                { v: 'rating', n: '评分' },
            ],
        },
    ],
    3: [
        {
            key: 'cateId',
            name: '分类',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '剧情' },
                { v: '2', n: '爱情' },
                { v: '3', n: '动画' },
                { v: '4', n: '喜剧' },
                { v: '5', n: '战争' },
                { v: '6', n: '歌舞' },
                { v: '7', n: '古装' },
                { v: '8', n: '奇幻' },
                { v: '9', n: '冒险' },
                { v: '10', n: '动作' },
                { v: '11', n: '科幻' },
                { v: '12', n: '悬疑' },
                { v: '13', n: '犯罪' },
                { v: '14', n: '家庭' },
                { v: '15', n: '传记' },
                { v: '16', n: '运动' },
                { v: '18', n: '惊悚' },
                { v: '20', n: '短片' },
                { v: '21', n: '历史' },
                { v: '22', n: '音乐' },
                { v: '23', n: '西部' },
                { v: '24', n: '武侠' },
                { v: '25', n: '恐怖' },
            ],
        },
        {
            key: 'area',
            name: '地區',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '国产' },
                { v: '3', n: '香港' },
                { v: '6', n: '台湾' },
                { v: '5', n: '美国' },
                { v: '18', n: '韩国' },
                { v: '2', n: '日本' },
            ],
        },
        {
            key: 'year',
            name: '年代',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '162', n: '2026' },
                { v: '107', n: '2025' },
                { v: '119', n: '2024' },
                { v: '153', n: '2023' },
                { v: '101', n: '2022' },
                { v: '118', n: '2021' },
                { v: '16', n: '2020' },
                { v: '7', n: '2019' },
                { v: '2', n: '2018' },
                { v: '3', n: '2017' },
                { v: '22', n: '2016' },
                { v: '2015', n: '2015以前' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            init: 'update',
            value: [
                { v: 'update', n: '最新' },
                { v: 'hot', n: '最热' },
                { v: 'rating', n: '评分' },
            ],
        },
    ],
    4: [
        {
            key: 'cateId',
            name: '分类',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '剧情' },
                { v: '2', n: '爱情' },
                { v: '3', n: '动画' },
                { v: '4', n: '喜剧' },
                { v: '5', n: '战争' },
                { v: '6', n: '歌舞' },
                { v: '7', n: '古装' },
                { v: '8', n: '奇幻' },
                { v: '9', n: '冒险' },
                { v: '10', n: '动作' },
                { v: '11', n: '科幻' },
                { v: '12', n: '悬疑' },
                { v: '13', n: '犯罪' },
                { v: '14', n: '家庭' },
                { v: '15', n: '传记' },
                { v: '16', n: '运动' },
                { v: '18', n: '惊悚' },
                { v: '20', n: '短片' },
                { v: '21', n: '历史' },
                { v: '22', n: '音乐' },
                { v: '23', n: '西部' },
                { v: '24', n: '武侠' },
                { v: '25', n: '恐怖' },
            ],
        },
        {
            key: 'area',
            name: '地區',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '1', n: '国产' },
                { v: '3', n: '香港' },
                { v: '6', n: '台湾' },
                { v: '5', n: '美国' },
                { v: '18', n: '韩国' },
                { v: '2', n: '日本' },
            ],
        },
        {
            key: 'year',
            name: '年代',
            init: '',
            value: [
                { v: '', n: '全部' },
                { v: '162', n: '2026' },
                { v: '107', n: '2025' },
                { v: '119', n: '2024' },
                { v: '153', n: '2023' },
                { v: '101', n: '2022' },
                { v: '118', n: '2021' },
                { v: '16', n: '2020' },
                { v: '7', n: '2019' },
                { v: '2', n: '2018' },
                { v: '3', n: '2017' },
                { v: '22', n: '2016' },
                { v: '2015', n: '2015以前' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            init: 'update',
            value: [
                { v: 'update', n: '最新' },
                { v: 'hot', n: '最热' },
                { v: 'rating', n: '评分' },
            ],
        },
    ],
}

async function getConfig() {
    appConfig.imgDomain = await getImgDomain()
    return jsonify(appConfig)
}

async function getImgDomain() {
    try {
        let { data } = await $fetch.get(`${appConfig.site}/api/v2/settings/resourceDomainConfig`, {
            headers: getHeader(),
        })
        let domain = argsify(data).data.imgDomain
        let domainList = domain.split(',')
        domain = domainList[Math.floor(Math.random() * domainList.length)]

        return domain.startsWith('http') ? domain : 'https://' + domain
    } catch (error) {
        console.log(error)
    }
}

async function getCards(ext) {
    ext = JSON.parse(ext)
    console.log(ext)

    let cards = []
    let { id, page = 1 } = ext

    if (id === 'home') {
        if (page > 1) return JSON.stringify({ list: [] })
        let url = `${appConfig.site}/api/slide/list?pos_id=88`
        const { data } = await $fetch.get(url, { headers: getHeader() })
        JSON.parse(data).data.forEach((e) => {
            const name = e.title
            const id = e.jump_id
            const pic = appConfig.imgDomain + e.thumbnail

            cards.push({
                vod_id: id.toString(),
                vod_name: name,
                vod_pic: pic,
                ext: { id: id },
            })
        })

        return JSON.stringify({ list: cards })
    } else if (id === 99 || id === 50) {
        if (page > 1) return JSON.stringify({ list: [] })
        let url = `${appConfig.site}/api/dyTag/list?category_id=${id}&page=${page}`
        const { data } = await $fetch.get(url, { headers: getHeader() })
        argsify(data).data.forEach((e) => {
            let duration = e.name
            e.dataList.forEach((item) => {
                const name = item.title
                const id = item.id
                const pic = appConfig.imgDomain + item.path
                const remarks = item.mask
                cards.push({
                    vod_id: id.toString(),
                    vod_name: name,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    vod_duration: duration,
                    ext: { id: id },
                })
            })
        })

        return JSON.stringify({ list: cards })
    }

    let url = `${appConfig.site}/api/crumb/list?fcate_pid=${id}&area=${ext?.filters?.area ?? ''}&year=${ext?.filters?.year ?? ''}&type=0&sort=${ext?.filters?.sort ?? ''}&page=${page}&category_id=${ext?.filters?.cateId ?? ''}`
    console.log(url)

    const { data } = await $fetch.get(url, { headers: getHeader() })

    JSON.parse(data).data.forEach((e) => {
        const name = e.title
        const id = e.id
        const pic = appConfig.imgDomain + e.path
        cards.push({
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: pic,
            vod_remarks: e.mask || '',
            ext: { id: id },
        })
    })

    return JSON.stringify({ list: cards, filter: filterObj[id] || [] })
}

async function getTracks(ext) {
    ext = JSON.parse(ext)

    let list = []
    let id = ext.id
    let url = `${appConfig.site}/api/video/detailv2?id=${id}`

    const { data } = await $fetch.get(url, { headers: getHeader() })
    try {
        JSON.parse(data).data.source_list_source.forEach((e) => {
            if (e.source_key === 'back_source_list_p2p') return
            let title = e.name
            let tracks = []
            e.source_list.forEach((item) => {
                tracks.push({
                    name: item.source_name,
                    ext: { url: item.url },
                })
            })
            list.push({
                title,
                tracks,
            })
        })
    } catch (error) {
        $print(error)
    }

    return JSON.stringify({ list: list })
}

async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    let { url } = ext
    let playUrl = url
    let header = getHeader()

    return JSON.stringify({ urls: [playUrl], headers: [header] })
}

async function search(ext) {
    ext = JSON.parse(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/api/v2/search/videoV2?key=${text}&category_id=88&page=${page}&pageSize=20`
    const headers = getHeader()

    const { data } = await $fetch.get(url, { headers: headers })

    JSON.parse(data).data.forEach((e) => {
        const name = e.title
        const id = e.id
        const pic = appConfig.imgDomain + e.thumbnail
        cards.push({
            vod_id: id.toString(),
            vod_name: name,
            vod_pic: pic,
            vod_remarks: e.mask || '',
            ext: { id: id },
        })
    })

    return JSON.stringify({ list: cards })
}

function getHeader() {
    return {
        'User-Agent':
            'Mozilla/5.0 (Linux; Android 9; V2196A Build/PQ3A.190705.08211809; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Mobile Safari/537.36;webank/h5face;webank/1.0;netType:NETWORK_WIFI;appVersion:416;packageName:com.jp3.xg3',
        Referer: appConfig.site,
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
