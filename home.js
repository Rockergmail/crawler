const SimpleCrawler = require('simplecrawler');
const cheerio = require('cheerio');
const htmlDecode = require('js-htmlencode').htmlDecode;

const crawler_url = 'http://baijia.baidu.com';
const crawler =  new SimpleCrawler(crawler_url);

// config crawler
crawler.discoverResources = false;

crawler.on("fetchcomplete", (queueItem, data, res) => {
    const $ = cheerio.load(data);
    $("#menu a").each(function(index, value){
       console.log(`${index} -> ${$(this).attr("href")}`);
    });

});

crawler.start();

