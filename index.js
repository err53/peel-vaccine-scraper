require('dotenv').config()

const puppeteer = require("puppeteer");
const fs = require("fs");
const fsprom = require("fs/promises");
const fetch = require("node-fetch");

const main = async () => {
  let browser, page;

  // setup page
  try {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  } catch (err) {
    console.error(err);
    console.error("Unable to launch browser. Aborting...");
    return;
  }

  // navigate to page
  try {
    await page.goto(
      "https://www.peelregion.ca/coronavirus/vaccine/book-appointment/",
      {
        waitUntil: "networkidle0",
      }
    );
  } catch (err) {
    console.error(err);
    console.error("Unable to navigate to the sign-in page. Aborting...");
    await browser.close();
    return;
  }

  // get HTML element from DOM
  try {
    // because numerical ids are fucked
    const inner_html = await page.evaluate(
      () => document.getElementById("18").innerHTML
    );
    // console.log(inner_html);

    // read prevRun
    if (fs.existsSync("./prevRun/peelregion.html")) {
      const asdf = await fsprom.readFile("./prevRun/peelregion.html", "utf8");
      // run diff
      if (inner_html !== asdf) {
        // if diff
        console.log("diff detected!")
        const discordURL = process.env.DISCORD_WEBHOOK_URL;
        const webhookParams = {
          content: `Change in the 18+ Vaccination Page Detected <@&837857458848137300> \nhttps://github.com/jhthenerd/peel-vaccine-scraper/commits/main`,
          allowed_mentions: {
            parse: ['roles'],
          },
        };
        try {
          await fetch(discordURL, {
            method: 'post',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookParams)
          });
        } catch (err) {
          console.error(err)
        }
      }
    }
    // save the innerhtml to the file and exit
    await fsprom.writeFile("./prevRun/peelregion.html", inner_html);
  } catch (err) {
    console.error(err);
  }

  // close the browser
  await browser.close();
};

main();
