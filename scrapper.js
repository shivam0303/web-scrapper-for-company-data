const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');  
const {executablePath} = require('puppeteer');
const { createObjectCsvWriter } = require('csv-writer');
const companies = require('./companies');


puppeteer.use(stealthPlugin());

async function scrapeLinkedIn(company) {
    const browser = await puppeteer.launch({ headless: false, executablePath: executablePath() });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // const email = 'shivam.sv0303@gmail.com';

    try {
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(`${company} website`)}`);
        await page.waitForSelector('a');

        const websiteLink = await page.$eval('h3', element => element.parentElement.getAttribute('href'));
      
        if (!websiteLink) {
            throw new Error('Website link not found');
        }

        console.log('Website:', websiteLink);

        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(`${company} LinkedIn`)}`);
        await page.waitForSelector('a');

        const linkedInPageLink = await page.$eval('h3', element => element.parentElement.getAttribute('href'));

        if (!linkedInPageLink) {
            throw new Error('LinkedIn page not found');
        }

        console.log('LinkedIn:', linkedInPageLink);

        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(`${company} top management team linkedin`)}`);
        await page.waitForSelector('h3');

        //scrap the names of top 2/3 management team with their linkedin profile
        const topManagementProfiles = await page.evaluate(() => {
            const profiles = [];
            const profileElements = document.querySelectorAll('.g.Ww4FFb.vt6azd.tF2Cxc.asEBEc');
            profileElements.forEach(element => {
              const titleElement = element.querySelector('h3');
              const urlElement = element.querySelector('a');
              if (titleElement && urlElement) {
                console.log('Title:', titleElement.innerText);
                const title = titleElement.innerText.toLowerCase();
                const url = urlElement.href;
                if (title.includes('ceo') || title.includes('co-founder') || title.includes('director') || title.includes('team lead') || title.includes('president') || title.includes('coo') || title.includes('cto')) {
                    profiles.push({ title, url });
                }
              }
            });
            return profiles;
        });


        console.log('Top Management Profiles:', topManagementProfiles);


        // scrapping from linkedin is not possible due to authentication issue
        // await page.goto(linkedInPageLink + '/people');
    
        // await page.type('#username', email);
        // await page.type('#password', password);
        // await page.click('button[type="submit"]');

        // await page.waitForNavigation();
        // verify as a human everytime for scrapping

        
        return { companyName: company, websiteLink, linkedInPageURL: linkedInPageLink, topProfiles: JSON.stringify(topManagementProfiles)};
    } catch (error) {
        console.error('Error:', error.message);
        return null;
    } finally {
        await browser.close();
    }
}

(async () => {
    const records = [];
    for (const company of companies) {
        const record = await scrapeLinkedIn(company);
        if (record) {
            records.push(record);
        }
    }

    const csvWriter = createObjectCsvWriter({
        path: 'output.csv',
        header: [
            { id: 'companyName', title: 'Company Name' },
            { id: 'websiteLink', title: 'Website Link' },
            { id: 'linkedInPageURL', title: 'LinkedIn Page URL' },
            { id: 'topProfiles', title: 'Top Management Profiles'}
        ]
    });

    await csvWriter.writeRecords(records);
})();
