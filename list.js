const SimpleCrawler = require('simplecrawler');
const cheerio = require('cheerio');
const htmlDecode = require('js-htmlencode').htmlDecode;
const request = require('request');
const url = require('url');

const crawler_url = 'http://baijia.baidu.com/?tn=listarticle&labelid=100';
const crawler = new SimpleCrawler(crawler_url);

let pageUrlArr = [];

// config crawler
crawler.discoverResources = false;

crawler.on("fetchcomplete", (queueItem, data, res) => {
    const $ = cheerio.load(data);
});



crawler.start();

