'use strict';
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');

module.exports = {
  '* * * * *': async () => {
    console.log('1. get plans');
    const plans = await strapi.query('plan').find({ time_lte: new Date() });

    console.log('2. execute plans');
    for (const plan of plans) {
      console.log('3. plan execute', plan.id);
      const time = (new Date(plan.time)).getTime() + 86400000;
      const days = plan.days.map(row => Number(row.value));
      const today = new Date().getDay();

      console.log('4. plan update');
      await strapi.query('plan').update({ id: plan.id }, { time });

      if (days.indexOf(today) >= 0) {
        try {
          console.log('plan : ', plan.id);
          await execute(plan);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
};


async function execute(plan) {
  const { url, identifier, password, mailings } = plan;
  const temp = `../../tmp/screenshot/${Date.now()}.jpeg`;
  const headers = { 'Accept-Language': 'ko' };

  if (!fs.existsSync(`../../tmp/screenshot`)) fs.mkdirSync(`../../tmp/screenshot`, { recursive: true });
  if (identifier && password) {
    const token = Buffer.from(`${identifier}:${password}`, "utf8").toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  console.log('capture begin');
  await capture(url, temp, headers);
  console.log('capture sucess');

  const author = await strapi.query('author').findOne();
  const transporter = getTransporter(author.email, author.password);

  console.log('sending mails');
  for (const mailing of mailings) {
    await transporter.sendMail({
      from: `"${author.name}" <${author.email}>`,
      to: mailing.email,
      subject: plan.title,
      html: '<img src="cid:captured.jpeg"/>',
      attachments: [{
        filename: 'image.jpeg',
        path: temp,
        cid: 'captured.jpeg'
      }]
    });
  }

  fs.rmSync(temp);
}

async function capture(url, dst, headers = {}) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none', '--lang=ko-KR,ko'] });
  const page = await browser.newPage();

  page.setExtraHTTPHeaders(headers);

  await page.goto(url);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "language", { get: () => "ko-KR" });
    Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko"] });
  });
  await page.evaluateHandle('document.fonts.ready');

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight + 2000,
      deviceScaleFactor: window.devicePixelRatio,
      waitUntil: 'networkidle2',
    };
  });

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  await page.setViewport(dimensions);
  await page.screenshot({ path: dst, quality: 60, type: 'jpeg' });
  await browser.close();
}

function getTransporter(identifier, password) {
  const transporter = nodemailer.createTransport({
    service: 'Naver',
    host: 'smtp.naver.com',
    auth: { user: identifier, pass: password }
  });

  return transporter;
}
