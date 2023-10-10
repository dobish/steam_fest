const puppeteer = require('puppeteer');
const fs = require('fs').promises;

(async () => {
    // Launch a headless browser
    const browser = await puppeteer.launch({ headless: "new" });

    // Open a new page
    const page = await browser.newPage();

    //Steamfest URL
    const url = "https://store.steampowered.com/sale/nextfest";

    await page.setViewport({
        width: 640,
        height: 3000,
        deviceScaleFactor: 1,
    });

    // Navigate to a URL
    await page.goto(url);

    // Find all elements with IDs that start with "SaleSection"
    const elements = await page.$$('[id^="Tab_"]');


    if (elements.length > 0) {
        // Find all buttons. Returns an array of buttons
        const buttonsArray = await Promise.all(
            elements.map(async element => {
                return await page.evaluate(el => el.id, element);
            })
        );
        //Removes dupliactes if they exist and puts in a new array
        uniqueButtonArray = [...new Set(buttonsArray)];

        const fullArray = [];

        //Loop through category tabs and go to coresponding URL
        for (x of getUrls(uniqueButtonArray, url)) {

            await page.goto(x, { timeout: 60000, waitUntil: 'domcontentloaded' });
            console.log("We are on " + page.url());

            const sections = await page.$$('[id^="SaleSection_"]');

            //Finds all salesections on a page. They contain urls to specific games
            if (sections.length > 0) {
                // Find all buttons. Returns an array of buttons
                const sectionArray = await Promise.all(
                    sections.map(async element => {
                        return await page.evaluate(el => el.id, element);
                    })
                );

                //Wait for 1 second to give website time to fully load
                await page.waitForTimeout(1000);

                const urlsArray = [];

                //Go through all elements with IDs from an array
                for (el of sectionArray) {
                    const elementID = el;
                    const parentElement = await page.$(`#${elementID}`);
                    if (parentElement) {
                        const links = await page.$$eval(`#${elementID} a`, anchors => {
                            return anchors.map(anchor => anchor.href);
                        });
                        if (links.length > 0) {
                            console.log(links.length);
                            urlsArray.push(...links);
                        } else {
                            console.log('No <a> elements found within the parent element');
                        }
                    }
                }

                console.log(urlsArray.length)
                fullArray.push(...urlsArray);
            }
            console.log(fullArray.length);
        }

        //Remove duplicate URLs
        uniqueLinksArray = [...new Set(fullArray)];

        //Filter so only game links are in the array
        uniqueLinksArray = uniqueLinksArray.filter(e => e.includes('https://store.steampowered.com/app'))

        //Empty array for IDs
        const arrayOfIds = [];

        //Get only IDs because games repeat with different URLs
        for (u of uniqueLinksArray) {
            //Select only ID and push to array
            arrayOfIds.push(u.split('app/').pop().split('/')[0]);
        }
        //Remove duplicates
        const newArrayOfIds = [...new Set(arrayOfIds)];


        console.log("Total amount of IDs " + newArrayOfIds.length)

        //Save IDs to file
        await fs.writeFile('export.json', JSON.stringify(arrayOfIds));


        //----- Getting data from a specific game section ------ //

        //Url to a game on the steam store
        const gameUrl = "https://store.steampowered.com/app/";

        //Array to store game objects
        const gameObjects = [];

        //Go to a game page
        for (const [index, id] of newArrayOfIds.entries()) {
            console.log("Progress " + index + "/" + newArrayOfIds.length)
            await page.goto(gameUrl + id, { timeout: 60000, waitUntil: 'domcontentloaded' })

            console.log("We are on " + page.url());

            //Wait for 1s
            await page.waitForTimeout(1000);

            //Check if it's a valid game page. Check if title element exist
            const titleID = 'appHubAppName';
            const titleElement = await page.$(`div#${titleID}`);

            if (titleElement) {
                const developerID = "developers_list";
                const gameTitle = await page.evaluate(div => div.innerHTML, titleElement);
                const developerElement = await page.$(`div#${developerID}`);
                const developer = await page.evaluate(div => div.textContent, developerElement);
                const developerUrl = await page.$$eval(`#${developerID} a`, anchors => {
                    return anchors.map(anchor => anchor.href);
                })

                //Create an object and push it to an array
                const gameInfo = {
                    title: gameTitle,
                    dev: developer.replace(/\s+/g, ' ').trim(),
                    devUrl: developerUrl
                };
                gameObjects.push(gameInfo);

                console.log(gameInfo);

                console.log(`Valid game  "${gameTitle}" and it's developer is "${developer.replace(/\s+/g, ' ').trim()}"`);
            }
            else {
                console.log("Not a valid game page")
            }

        }

        console.log(gameObjects);

        //Save games data to a JSON file
        await fs.writeFile('games.json', JSON.stringify(gameObjects));

    } else {
        console.error('No elements found with IDs starting with "Tab"');
    }

    //Close the browser
    await browser.close();
})();

//Return array of tab URLs for navigation
getUrls = (id, url) => {
    const allUrls = [];
    for (let i = 0; i < id.length; i++) {
        allUrls.push(url + "?tab=" + id[i].slice(4))
    }
    return allUrls;
}
