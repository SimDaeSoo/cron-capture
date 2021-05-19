'use strict';
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const dayjs = require('dayjs');
const fs = require('fs');

module.exports = {
  '* * * * *': async () => {
    const plans = await strapi.query('plan').find({ time_lte: new Date() });

    for (const plan of plans) {
      const time = (new Date(plan.time)).getTime() + 86400000;

      await execute(plan);
      await strapi.query('plan').update({ id: plan.id }, { time });
    }
  }
};


async function execute(plan) {
  const { url, identifier, password, mailings } = plan;
  const temp = `../../tmp/screenshot/${Date.now()}.png`;
  const headers = { 'Accept-Language': 'ko' };

  if (!fs.existsSync(`../../tmp/screenshot`)) fs.mkdirSync(`../../tmp/screenshot`, { recursive: true });
  if (identifier && password) {
    const token = Buffer.from(`${identifier}:${password}`, "utf8").toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  await capture(url, temp, headers);

  const author = await strapi.query('author').findOne();
  const transporter = getTransporter(author.email, author.password);

  for (const mailing of mailings) {
    await transporter.sendMail({
      from: `"${author.name}" <${author.email}>`,
      to: mailing.email,
      subject: plan.title,
      html: '<img src="cid:captured.png"/>',
      attachments: [{
        filename: 'image.png',
        path: temp,
        cid: 'captured.png'
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

  const dimensions = await page.evaluate(() => {
    return {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      deviceScaleFactor: window.devicePixelRatio,
    };
  });

  await page.setViewport(dimensions);
  await page.screenshot({ path: dst });
  await browser.close();
}

function getTransporter(identifier, password) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: identifier, pass: password }
  });

  return transporter;
}