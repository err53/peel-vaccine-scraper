const functions = require("firebase-functions");
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const diff = require("diff");
const PasteClient = require("pastebin-api").default;

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

const client = new PasteClient(functions.config().pastebin.key);

const scrape = async () => {
  const sitesRef = admin.firestore().collection("sites");
  const sitesSnapshot = await sitesRef.get();
  // loop through the sites
  sitesSnapshot.forEach(async (doc) => {
    // download page
    const $ = cheerio.load(await (await fetch(doc.data().url)).text());
    // get HTML element from DOM
    const innerHTML = $(doc.data().selector).html();
    // run diff
    if (innerHTML !== doc.data().prevInnerHTML) {
      // there is a difference
      console.log(`diff detected for ${doc.id}`);
      const discordURL = functions.config().discord.url;
      const webhookParams = {
        content: `${doc.data().name}: Change Detected! <@&837857458848137300> 
url: ${doc.data().url}
diff: ${
          doc.data().prevInnerHTML != null
            ? await client.createPaste({
                code: diff.createPatch(
                  doc.data().url,
                  doc.data().prevInnerHTML,
                  innerHTML
                ),
                format: "diff",
                name: `Diff of ${doc.data().name}`,
                publicity: 1,
              })
            : "prevInnerHTML is null or undefined"
        }
`,
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

      // merge innerHtml into Firebase
      await doc.ref.update({
        prevInnerHTML: innerHTML,
      });
    }
  });
};

if (functions.config().isDebug) {
  exports.scrape = functions.https.onRequest((req, res) => {
    scrape();
    res.send();
  });
} else {
  exports.scrape = functions.pubsub.schedule("every 2 minutes").onRun(scrape);
}
exports.testScrape = scrape;
