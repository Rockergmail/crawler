const SimpleCrawler = require('simplecrawler');
const cheerio = require('cheerio');
const htmlDecode = require('js-htmlencode').htmlDecode;
const request = require('request');
const url = require('url');

const crawler_url = 'http://baijia.baidu.com/?tn=listarticle&labelid=100';
const crawler = new SimpleCrawler(crawler_url);

let listArr = [];

// config crawler
crawler.discoverResources = false;

crawler.on("fetchcomplete", (queueItem, data, res) => {
    const $ = cheerio.load(data);
    $("#feeds .feeds-item").each(function(index, value){
       listArr.push({
           aid: $(this).attr("id").replace(/[item-]/g,""),
           title: $(this).find("h3 a").text(),
           intro: $(this).find(".feeds-item-text1").text(),
           link: $(this).find("h3 a").attr("href"),
           img: $(this).find("img").attr("src")
       })
    });

    goAjax(2, url.parse(queueItem.url, true).query.labelid, listArr[listArr.length-1].aid);

});

function goAjax (page=2, labelid, prevarticalid) {
    let url = `http://baijia.baidu.com/ajax/labellatestarticle?page=${page}&pagesize=20&labelid=${labelid}&prevarticalid=${prevarticalid}`
    request(url, function(error, response, body){
        let list = JSON.parse(body).data.list;

        // 出错的时候，list为undefined
        if (!list) {
            return false;
        }

        for (let i = 0; i < list.length; i++) {
            listArr.push({
                aid: list[i].ID,
                title: list[i].m_title,
                intro: list[i].m_summery,
                link: list[i].m_display_url,
                img: list[i].m_image_url
            })
        }
        console.log(listArr.length);
        goAjax(page+1, labelid, listArr[listArr.length-1].aid);
    })
}

crawler.start();

