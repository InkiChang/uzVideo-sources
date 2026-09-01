// ignore
//@name:jable
//@version:1
//@webSite:https://jable.tv
//@remark:移植自 XPTV jable.js
//@type:101
// ignore

// ============================================================
// uzVideo 扩展 - 自动转换自 XPTV jable.js
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
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36'

let appConfig = {
  ver: 1,
  title: 'jable',
  site: 'https://jable.tv',
}

async function getConfig() {
  let config = appConfig
  config.tabs = await getTabs()
  return jsonify(config)
}

async function getTabs() {
  let list = []
  let ignore = ['首页']
  function isIgnoreClassName(className) {
    return ignore.some((element) => className.includes(element))
  }
  let classurl = `${appConfig.site}/categories/?mode=async&function=get_block&block_id=list_categories_video_categories_list&sort_by=avg_videos_popularity`

  const { data } = await $fetch.get(classurl, {
    headers: {
      'User-Agent': UA,
    },
  })
  if (data.includes('Just a moment...')) {
    $utils.openSafari(classurl, UA)
  }
  const $ = cheerio.load(data)

  let allClass = $('.container .col-6.col-sm-4.col-lg-3')
  allClass.each((_, e) => {
    const name = $(e).find('h4').text()
    const href = $(e).find('a').attr('href')
    const isIgnore = isIgnoreClassName(name)
    if (isIgnore) return

    list.push({
      name,
      ext: {
        typeurl: href,
      },
      ui: 1,
    })
  })

  return list
}

async function getCards(ext) {
  ext = argsify(ext)
  let cards = []
  let { page = 1, typeurl } = ext
  const url =
    typeurl +
    `?mode=async&function=get_block&block_id=list_videos_common_videos_list&sort_by=post_date&from=${page}&_=${Date.now()}`

  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': UA,
      Cookie: 'language=cn_CN',
    },
  })
  if (data.includes('Just a moment...')) {
    $utils.openSafari(url, UA)
  }
  const $ = cheerio.load(data)

  $('#list_videos_common_videos_list .container .row > div').each(
    (_, element) => {
      const href = $(element).find('.title a').attr('href')
      const title = $(element).find('.title a').text()
      const cover = $(element).find('.img-box img').attr('data-src')
      const duration = $(element).find('.label').text()

      cards.push({
        vod_id: href,
        vod_name: title,
        vod_pic: cover,
        vod_duration: duration,
        ext: {
          url: href,
        },
      })
    }
  )

  return jsonify({
    list: cards,
  })
}

async function getTracks(ext) {
  ext = argsify(ext)
  let tracks = []
  let url = ext.url

  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': UA,
    },
  })
  if (data.includes('Just a moment...')) {
    $utils.openSafari(url, UA)
  }
  const $ = cheerio.load(data)
  let script = $('#site-content .container .col')
    .eq(0)
    .find('section')
    .eq(0)
    .find('script:last')
    .text()
  let playUrl = script.match(/var hlsUrl = '(.*)';/)[1]

  tracks.push({
    name: '播放',
    pan: '',
    ext: {
      url: playUrl,
    },
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
  const url = ext.url

  return jsonify({ urls: [url] })
}

async function search(ext) {
  ext = argsify(ext)
  let cards = []

  let text = encodeURIComponent(ext.text)
  let page = ext.page || 1
  let url = `${
    appConfig.site
  }/search/${text}/?mode=async&function=get_block&block_id=list_videos_videos_list_search_result&q=${text}&sort_by=&from=${page}&_=${Date.now()}`

  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': UA,
    },
  })

  const $ = cheerio.load(data)

  $('#list_videos_videos_list_search_result .container .row > div').each(
    (_, element) => {
      const href = $(element).find('.title a').attr('href')
      const title = $(element).find('.title a').text()
      const cover = $(element).find('.img-box img').attr('data-src')
      const duration = $(element).find('.label').text()

      cards.push({
        vod_id: href,
        vod_name: title,
        vod_pic: cover,
        vod_duration: duration,
        ext: {
          url: href,
        },
      })
    }
  )

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
