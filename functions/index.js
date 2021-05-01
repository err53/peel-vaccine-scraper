const functions = require("firebase-functions");
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const admin = require("firebase-admin");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

const scrape = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    const sitesRef = admin.firestore().collection("sites");
    await admin.firestore().runTransaction(async (t) => {
      const sitesSnapshot = await t.get(sitesRef);
      sitesSnapshot.forEach(async (doc) => {
        // navigate to page
        await page.goto(doc.data().url, {
          waitUntil: "networkidle0",
        });

        // get HTML element from DOM
        const innerHTML = await page.$eval(
          doc.data().selector,
          (el) => el.innerHTML
        );
        // run diff
        if (innerHTML !== doc.data().prevInnerHTML) {
          // there is a difference
          console.log(`diff detected for ${doc.id}`);
          const discordURL = functions.config().discord.url;
          const webhookParams = {
            content: `${
              doc.data().name
            }: Change Detected! <@&837857458848137300> \n${doc.data().url}`,
            allowed_mentions: {
              parse: ["roles"],
            },
          };
          await fetch(discordURL, {
            method: "post",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookParams),
          });
        }
        // merge innerHtml into Firebase
        t.update(doc.ref, {
          prevInnerHTML: innerHTML,
        });
      });
    });
  } catch (err) {
    // close the browser in the case of an error
    await browser.close();
    throw err;
  }

  // close the browser
  await browser.close();
};

if (functions.config().isDebug) {
  exports.scrape = functions.https.onRequest(scrape);
} else {
  exports.scrape = functions.pubsub.schedule("every 2 minutes").onRun(scrape);
}
exports.testScrape = scrape;
