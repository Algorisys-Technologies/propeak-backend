const { chromium } = require("@playwright/test");
const fs = require("fs/promises");
const BACKUP_FILE = "./backup/leads_progress.json";

require("dotenv").config();

function extractISODate(details) {
  const dateRegex =
    /\b(\d{1,2} \w{3}'\d{2}|\d{2} \w{3}'\d{2}|\w+\sday|yesterday)\b/i;
  const timeRegex = /\b\d{1,2}:\d{2} (AM|PM)\b/i;

  const matchDate = details.match(dateRegex);
  const matchTime = details.match(timeRegex);
  const currentDate = new Date();

  let extractedDate = currentDate;

  if (matchDate) {
    const datePart = matchDate[0].toLowerCase();

    if (datePart === "yesterday") {
      extractedDate.setDate(currentDate.getDate() - 1);
    } else if (/\d{1,2} \w{3}'\d{2}/.test(datePart)) {
      extractedDate = new Date(datePart.replace("'", "20"));
    }
  }

  if (matchTime) {
    const timePart = matchTime[0];
    const [hours, minutes] = timePart.split(/[: ]/).map(Number);
    const isPM = timePart.includes("PM");

    extractedDate.setHours(isPM ? hours + 12 : hours, minutes);
  }

  return extractedDate.toISOString();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_HEAP_MB = 512;
const BATCH_SIZE = 10;
const microBatchSize = 3;

function isMemoryHigh() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Heap Used: ${used.toFixed(2)} MB`);
  return used > MAX_HEAP_MB;
}

async function loadBackupIfExists() {
  try {
    const data = await fs.readFile(BACKUP_FILE, "utf8");
    const parsed = JSON.parse(data);
    leadsData = parsed;
    seenLeadIds = new Set(parsed.map((l) => l.id));
    console.log(`✅ Resumed from backup with ${leadsData.length} leads.`);
  } catch {
    console.log("ℹ️ No backup file found, starting fresh.");
    leadsData = [];
    seenLeadIds = new Set();
  }
}

async function saveBackup(leadsData) {
  await fs.writeFile(BACKUP_FILE, JSON.stringify(leadsData, null, 2));
  //console.log(`💾 Backup saved. Total leads so far: ${leadsData.length}`);
}

async function processSingleLead(lead, page) {
  lead.startDate = extractISODate(lead.dateTime);
  try {
    const leadElement = await page
      .locator(`.wrd_elip:has-text("${lead.name}")`)
      .first();
    await leadElement.scrollIntoViewIfNeeded();
    await leadElement.click();
    await page.waitForTimeout(1000);

    const labelLocator = page
      .locator("#splitviewlabelheader .wrd_elip")
      .first();
    lead.label =
      (await labelLocator.count()) > 0
        ? (await labelLocator.innerText()).trim()
        : "N/A";

    const mobileLocator = page.locator("#headerMobile");
    if ((await mobileLocator.count()) > 0) {
      await mobileLocator.click();
      await page.waitForTimeout(500);
      const mobileNumber = await page.evaluate(() =>
        navigator.clipboard.readText()
      );
      // lead.mobile =
      //   mobileNumber && !isNaN(Number(mobileNumber)) ? mobileNumber : "N/A";
      const isValidPhoneNumber = (str) => {
        return /^[+]?[\d\s-]{7,20}$/.test(str);
      };

      lead.mobile =
        mobileNumber && isValidPhoneNumber(mobileNumber.trim())
          ? mobileNumber.trim()
          : "N/A";
    } else {
      lead.mobile = "N/A";
    }

    const emailLocator = page.locator("#headerEmail");
    if ((await emailLocator.count()) > 0) {
      await emailLocator.click();
      await page.waitForTimeout(500);
      const email = await page.evaluate(() => navigator.clipboard.readText());
      lead.email = email.includes("@") ? email : "N/A";
    } else {
      lead.email = "N/A";
    }

    const addressLocator = page.locator("#headerAddress");
    if ((await addressLocator.count()) > 0) {
      await addressLocator.click();
      await page.waitForTimeout(500);
      const address = await page.evaluate(() => navigator.clipboard.readText());
      lead.address = address || "N/A";
    } else {
      lead.address = "N/A";
    }

    const contactNameLocator = page.locator("#left-name");
    if ((await contactNameLocator.count()) > 0) {
      await page.waitForTimeout(500);
      const name = await contactNameLocator.textContent();
      lead.contactPerson = name ? name.trim() : "N/A";
    } else {
      lead.contactPerson = "N/A";
    }

    return lead;
  } catch (error) {
    console.error(`Error processing lead ${lead.name}:`, error);
    return null;
  }
}

async function scrollToLoadAllLeads(page, browser, context, authKey) {
  const scrollableContainerSelector =
    "#splitViewContactList .ReactVirtualized__Grid";
  const leadsSelector = ".list .row";
  const leadsData = [];
  const seenLeadIds = new Set();
  let scrollAttempts = 0;
  let noNewLeadsCounter = 0;
  const maxNoNewLeadsScrolls = 5;
  const scrollDelay = 2000;

  await delay(5000);
  await page.waitForSelector(scrollableContainerSelector, { timeout: 30000 });

  while (true) {
    const currentLeadsData = await page.evaluate(
      ({ scrollableContainerSelector, leadsSelector }) => {
        const container = document.querySelector(scrollableContainerSelector);
        const leads = document.querySelectorAll(leadsSelector);
        return Array.from(leads).map((lead) => {
          const dateTimeElement = lead.querySelector(".fr .fs12.clr77");
          const dateTime = dateTimeElement
            ? dateTimeElement.innerText.trim()
            : "N/A";
          const detailsClone = lead.cloneNode(true);
          if (dateTimeElement) dateTimeElement.remove();
          return {
            id:
              lead.getAttribute("data-id") ||
              lead.querySelector(".wrd_elip")?.innerText?.trim() ||
              "N/A",
            name: lead.querySelector(".wrd_elip")?.innerText?.trim() || "N/A",
            productName:
              lead.querySelector(".wrd_elip .prod-name")?.innerText?.trim() ||
              "N/A",
            startDate: "N/A",
            dateTime,
            details:
              detailsClone.innerText.trim().replace(dateTime, "") || "N/A",
          };
        });
      },
      { scrollableContainerSelector, leadsSelector }
    );

    const newLeads = currentLeadsData.filter(
      (lead) => !seenLeadIds.has(lead.id)
    );
    if (newLeads.length === 0) {
      noNewLeadsCounter++;
      if (noNewLeadsCounter >= maxNoNewLeadsScrolls) break;
    } else {
      noNewLeadsCounter = 0;
    }

    // for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
    //   const batch = newLeads.slice(i, i + BATCH_SIZE);

    //   //sequential
    //   for (const lead of batch) {
    //     if (seenLeadIds.has(lead.id)) continue;
    //     const processed = await processSingleLead(lead, page);
    //     if (processed) {
    //       leadsData.push(processed);
    //       seenLeadIds.add(processed.id);
    //     }
    //   }

    //   // parallel processing
    //   // const results = await Promise.all(
    //   //   batch.map(async (lead) => {
    //   //     if (seenLeadIds.has(lead.id)) return null;
    //   //     const processed = await processSingleLead(lead, page);
    //   //     if (processed) seenLeadIds.add(processed.id);
    //   //     return processed;
    //   //   })
    //   // );
    //   // leadsData.push(...results.filter(Boolean));

    //   // if (leadsData.length % 10 === 0) {
    //   //   // await fs.writeFile(
    //   //   //   `leads_backup_${Date.now()}.json`,
    //   //   //   JSON.stringify(leadsData, null, 2)
    //   //   // );
    //   //   await saveBackup(leadsData);
    //   //   //console.log(`✔️ Backup saved. Total leads: ${leadsData.length}`);
    //   // }

    //   if (isMemoryHigh()) {
    //     console.log("🚨 High memory usage. Restarting browser context...");
    //     await page.close();
    //     await context.close();
    //     await browser.close();

    //     browser = await chromium.launch({ headless: true });
    //     context = await browser.newContext({
    //       permissions: ["clipboard-read", "clipboard-write"],
    //     });
    //     page = await context.newPage();

    //     // Re-add cookies
    //     const parsedCookies = authKey.split("; ").map((cookieStr) => {
    //       const [name, ...rest] = cookieStr.split("=");
    //       return {
    //         name,
    //         value: rest.join("="),
    //         domain: "seller.indiamart.com",
    //         path: "/",
    //         httpOnly: false,
    //         secure: true,
    //         sameSite: "Lax",
    //       };
    //     });
    //     await context.addCookies(parsedCookies);
    //     await page.goto("https://seller.indiamart.com/");
    //     await delay(2000);
    //   }

    //   await page.waitForTimeout(scrollDelay);
    // }

    for (let i = 0; i < newLeads.length; i += microBatchSize) {
      const microBatch = newLeads.slice(i, i + microBatchSize);
      let processedBatch = [];

      for (const lead of microBatch) {
        if (!seenLeadIds.has(lead.id)) {
          const processed = await processSingleLead(lead, page);
          if (processed) {
            leadsData.push(processed);
            seenLeadIds.add(processed.id);
            processedBatch.push(processed);
          }
        }
      }

      // processedBatch = await Promise.all(
      //   microBatch.map(async (lead) => {
      //     if (seenLeadIds.has(lead.id)) return null;

      //     const processed = await processSingleLead(lead, page);
      //     if (processed) {
      //       seenLeadIds.add(processed.id);
      //       return processed;
      //     }
      //     return null;
      //   })
      // );

      // leadsData.push(...processedBatch.filter(Boolean));

      await delay(300);

      if (isMemoryHigh()) {
        console.log("🚨 High memory usage. Restarting browser context...");
        await page.close();
        await context.close();
        await browser.close();

        browser = await chromium.launch({ headless: true });
        context = await browser.newContext({
          permissions: ["clipboard-read", "clipboard-write"],
        });
        page = await context.newPage();

        // Re-add cookies
        const parsedCookies = authKey.split("; ").map((cookieStr) => {
          const [name, ...rest] = cookieStr.split("=");
          return {
            name,
            value: rest.join("="),
            domain: "seller.indiamart.com",
            path: "/",
            httpOnly: false,
            secure: true,
            sameSite: "Lax",
          };
        });
        await context.addCookies(parsedCookies);
        await page.goto("https://seller.indiamart.com/");
        await delay(2000);
      }
    }

    await page.evaluate((selector) => {
      const container = document.querySelector(selector);
      if (container) container.scrollBy(0, 10);
    }, scrollableContainerSelector);

    scrollAttempts++;
  }

  console.log("🎉 All leads fetched.", leadsData, leadsData.length);
  return leadsData;
}

async function fetchLeads({
  start_dayToSelect,
  start_monthToSelect,
  start_yearToSelect,
  end_dayToSelect,
  end_monthToSelect,
  end_yearToSelect,
  authKey,
}) {
  console.log("In fetchLeads");

  //await loadBackupIfExists();

  let browser = await chromium.launch({ headless: false });
  let context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  let page = await context.newPage();

  try {
    const parsedCookies = authKey.split("; ").map((cookieStr) => {
      const [name, ...rest] = cookieStr.split("=");
      return {
        name,
        value: rest.join("="),
        domain: "seller.indiamart.com",
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      };
    });

    await context.addCookies(parsedCookies);
    await page.goto("https://seller.indiamart.com/");
    await delay(2000);

    const popupCloseButton = page.locator("button.nps-close.nps-toggle");
    try {
      await popupCloseButton.waitFor({ timeout: 5000 });
      await popupCloseButton.click();
      await delay(1000);
    } catch {}

    await page.getByRole("link", { name: "Lead Manager" }).click();
    await delay(3000);

    await page.locator("#filterCTA").click();
    await delay(2000);
    await page.getByText("Filters", { exact: true }).click();
    await delay(1000);
    await page.getByText("Select Date", { exact: true }).click();
    await delay(1000);
    await page.getByText("Custom Date", { exact: true }).click();
    await delay(2000);

    await page.waitForSelector("#custom_date_start", { timeout: 100000 });
    await page.locator("#custom_date_start").scrollIntoViewIfNeeded();
    await delay(1000);
    await page.locator("#custom_date_start").click();

    await page
      .locator(".rdrYearPicker select")
      .selectOption(`${start_yearToSelect}`);
    await delay(1000);
    await page
      .locator(".rdrMonthPicker select")
      .selectOption(`${start_monthToSelect}`);
    await delay(1000);
    await page
      .locator(`.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)`)
      .filter({ hasText: `${start_dayToSelect}` })
      .first()
      .click();
    await delay(2000);

    if (
      start_yearToSelect !== end_yearToSelect ||
      start_monthToSelect !== end_monthToSelect ||
      start_dayToSelect !== end_dayToSelect
    ) {
      await page
        .locator(".rdrYearPicker select")
        .selectOption(`${end_yearToSelect}`);
      await delay(1000);
      await page
        .locator(".rdrMonthPicker select")
        .selectOption(`${end_monthToSelect}`);
      await delay(1000);
      await page
        .locator(`.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)`)
        .filter({ hasText: `${end_dayToSelect}` })
        .first()
        .click();
      await delay(1000);
    }

    await page.getByText("Apply", { exact: true }).click();
    await delay(5000);

    // const startTime = Date.now();
    // const leads = await scrollToLoadAllLeads(page, browser, context, authKey);

    // const endTime = Date.now(); // ⏱️ End tracking
    // const timeTaken = (endTime - startTime) / 1000;

    // console.log(`✅ Scraping completed.`);
    // console.log(`📦 Total leads scraped: ${leads.length}`);
    // console.log(`⏱️ Total time taken: ${timeTaken.toFixed(2)} seconds`);

    return await scrollToLoadAllLeads(page, browser, context, authKey);
  } catch (err) {
    console.error("An error occurred in fetchLeads:", err);
  } finally {
    await browser.close();
  }
}

// fetchLeads({
//   // mobileNumber: "9892492782",
//   // password: "KIPINDIAMART2022",
//   start_dayToSelect: "29",
//   start_monthToSelect: "7", // April (0-based index: 0 : January, 1 : February, etc.)
//   start_yearToSelect: "2024",
//   end_dayToSelect: "29",
//   end_monthToSelect: "7", // April (0-based index: 0 : January, 1 : February, etc.)
//   end_yearToSelect: "2024",
//   authKey: `_gcl_au=1.1.731872204.1744261274; _ga=GA1.1.1676073735.1744261277; _ym_uid=1744261280639783108; _ym_d=1744261280; iploc=gcniso%3DIN%7Cgcnnm%3DIndia%7Cgctnm%3DMumbai%7Cgctid%3D70624%7Cgacrcy%3D10%7Cgip%3D106.222.205.216%7Cgstnm%3DMaharashtra; sortby=1#29141067; _ym_isad=2; _clck=i02qw8%7C2%7Cfvc%7C0%7C1926; _ym_visorc=b; empDet=; con_iso=; LGNSTR=0%2C2%2C1%2C1%2C1%2C1%2C1%2C0; im_iss=t%3DeyJ0eXAiOiJKV1QiLCJhbGciOiJzaGEyNTYifQ.eyJpc3MiOiJVU0VSIiwiYXVkIjoiOSo3KjYqNyowKiIsImV4cCI6MTc0NTU1NzAwNCwiaWF0IjoxNzQ1NDcwNjA0LCJzdWIiOiIyOTE0MTA2NyIsImNkdCI6IjI0LTA0LTIwMjUifQ.zR7HZGi7VoABZ7DsqX0B79vMZ1qktEVJahL6zRoXKSY; ImeshVisitor=fn%3DSachin%7Cem%3Ds%2A%2A%2A%2A%2A%2A%2A%2A%2A%2A%40kip.co.in%7Cphcc%3D91%7Ciso%3DIN%7Cmb1%3D9372657109%7Cctid%3D70624%7Cglid%3D29141067%7Ccd%3D24%2FAPR%2F2025%7Ccmid%3D12%7Cutyp%3DP%7Cev%3DV%7Cuv%3DV%7Custs%3D%7Cadmln%3D0%7Cadmsales%3D0; xnHist=pv%3D0%7Cipv%3Dundefined%7Cfpv%3D1%7Ccity%3Dundefined%7Ccvstate%3Dundefined%7Cpopupshown%3Dundefined%7Cinstall%3Dundefined%7Css%3Dundefined%7Cmb%3Dundefined%7Ctm%3Dundefined%7Cage%3Dundefined%7Ccount%3D1%7Ctime%3DThu%20Apr%2024%202025%2010%3A16%3A13%20GMT+0530%20%28India%20Standard%20Time%29%7Cglid%3D29141067%7Cgname%3Dundefined%7Cgemail%3Dundefined%7CcityID%3Dundefined; userDet=glid=29141067|loc_pref=4|fcp_flag=1|image=http://5.imimg.com/data5/SELLER/GlPhoto/2023/12/364896082/FM/MF/ZG/29141067/colour-logo-64x64.jpg|service_ids=326,233,355,228|logo=https://5.imimg.com/data5/SELLER/Logo/2024/6/424491046/CK/YZ/KD/29141067/new-logo-kip-90x90.jpg|psc_status=0|d_re=|u_url=https://www.indiamart.com/kip-chemicals-mumbai/|ast=A|lst=LST|ctid=70624|ct=Mumbai|stid=6489|st=Maharashtra|enterprise=0|mod_st=F|rating=4.6|nach=0|iec=AAHCK7941A|is_suspect=0|vertical=KCD|pns_no=8047763552|gst=27AAHCK7941A1ZL|pan=AAHCK7941A|cin=U51900MH2019PTC330444|collectPayments=0|is_display_invoice_banner=0|is_display_enquiry=0|is_display_credit=0|disposition=|disp_date=|recreateUserDetCookie=|vid=|did=|fid=|src_ID=3|locPref_enable=1; FCNEC=%5B%5B%22AKsRol-UhxNfDNFXvy9nDEx-47Scq7WVlidXLx_I6eMylkGFyJTYXtpUnMUlmrhzeiVJ-45tEmgQUUmBsAC72byxZAZ8MEUP1E_X7irB8jN11LpUGsikUXHB9U8-50HXHft66VkbKqFK--xIeIjA_P70sWxzxTLvtA%3D%3D%22%5D%5D; sessid=spv=7; __gads=ID=1b59f745b0dd7a6f:T=1744368575:RT=1745470617:S=ALNI_Ma40EwMWa2zHafeM3o5KZWi-4agCQ; __gpi=UID=000010993fccafbd:T=1744368575:RT=1745470617:S=ALNI_MZ9DphMta_F1whI-7g7yxnyL325VA; __eoi=ID=2f33fdc73bf658ff:T=1744368575:RT=1745470617:S=AA-Afja6hh3GE2oG_qrZEtmg3q5Q; _ga_8B5NXMMZN3=GS1.1.1745469980.11.1.1745470621.20.0.0`,
// });

module.exports = fetchLeads;
