const { chromium } = require("@playwright/test");
const fs = require("fs/promises");
const BACKUP_FILE = "./leads_progress.json";

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
  console.log(`💾 Backup saved. Total leads so far: ${leadsData.length}`);
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
      lead.mobile =
        mobileNumber && !isNaN(Number(mobileNumber)) ? mobileNumber : "N/A";
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

    for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
      const batch = newLeads.slice(i, i + BATCH_SIZE);
      for (const lead of batch) {
        if (seenLeadIds.has(lead.id)) continue;
        const processed = await processSingleLead(lead, page);
        if (processed) {
          leadsData.push(processed);
          seenLeadIds.add(processed.id);
        }
      }

      if (leadsData.length % 10 === 0) {
        // await fs.writeFile(
        //   `leads_backup_${Date.now()}.json`,
        //   JSON.stringify(leadsData, null, 2)
        // );
        await saveBackup(leadsData);
        console.log(`✔️ Backup saved. Total leads: ${leadsData.length}`);
      }

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

      await page.waitForTimeout(scrollDelay);
    }

    await page.evaluate((selector) => {
      const container = document.querySelector(selector);
      if (container) container.scrollBy(0, 10);
    }, scrollableContainerSelector);

    scrollAttempts++;
  }

  console.log("🎉 All leads fetched.", leadsData);
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

  await loadBackupIfExists();

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

    return await scrollToLoadAllLeads(page, browser, context, authKey);
  } catch (err) {
    console.error("An error occurred in fetchLeads:", err);
  } finally {
    await browser.close();
  }
}

fetchLeads({
  mobileNumber: "9892492782",
  password: "KIPINDIAMART2022",
  start_dayToSelect: "25",
  start_monthToSelect: "1", // April (0-based index: 0 : January, 1 : February, etc.)
  start_yearToSelect: "2025",
  end_dayToSelect: "2",
  end_monthToSelect: "2", // April (0-based index: 0 : January, 1 : February, etc.)
  end_yearToSelect: "2025",
  authKey: `_gcl_au=1.1.81073825.1744094912; _ga=GA1.1.188119037.1744094913; _ym_uid=1744094930157515051; _ym_d=1744094930; iploc=gcniso%3DIN%7Cgcnnm%3DIndia%7Cgctnm%3DMumbai%7Cgctid%3D70624%7Cgacrcy%3D10%7Cgip%3D106.222.205.216%7Cgstnm%3DMaharashtra; sortby=1#29141067; userDet=glid=29141067|loc_pref=4|fcp_flag=1|image=http://5.imimg.com/data5/SELLER/GlPhoto/2023/12/364896082/FM/MF/ZG/29141067/colour-logo-64x64.jpg|service_ids=326,233,355,228|logo=https://5.imimg.com/data5/SELLER/Logo/2024/6/424491046/CK/YZ/KD/29141067/new-logo-kip-90x90.jpg|psc_status=0|d_re=|u_url=https://www.indiamart.com/kip-chemicals-mumbai/|ast=A|lst=LST|ctid=70624|ct=Mumbai|stid=6489|st=Maharashtra|enterprise=0|mod_st=F|rating=4.6|nach=0|iec=AAHCK7941A|is_suspect=0|vertical=KCD|pns_no=8047763552|gst=27AAHCK7941A1ZL|pan=AAHCK7941A|cin=U51900MH2019PTC330444|collectPayments=0|is_display_invoice_banner=0|is_display_enquiry=0|is_display_credit=0|disposition=|disp_date=|recreateUserDetCookie=|vid=|did=|fid=|src_ID=3|locPref_enable=1; _clck=12adiyu%7C2%7Cfux%7C0%7C1924; _ym_isad=2; g_state={"i_p":1744189095505,"i_l":1}; LGNSTR=0%2C2%2C1%2C1%2C1%2C1%2C1%2C0; _ym_visorc=b; im_iss=t%3DeyJ0eXAiOiJKV1QiLCJhbGciOiJzaGEyNTYifQ.eyJpc3MiOiJVU0VSIiwiYXVkIjoiOSo5KjQqMio4KiIsImV4cCI6MTc0NDI3MjcxNCwiaWF0IjoxNzQ0MTg2MzE0LCJzdWIiOiIyOTE0MTA2NyIsImNkdCI6IjA5LTA0LTIwMjUifQ.GUEkoeBRNj0v9WlKJ4gDY3WjgX0oXQAen-OE-bsLMn4; ImeshVisitor=fn%3DSachin%7Cem%3Ds%2A%2A%2A%2A%2A%2A%2A%2A%2A%2A%40kip.co.in%7Cphcc%3D91%7Ciso%3DIN%7Cmb1%3D9892492782%7Cctid%3D70624%7Cglid%3D29141067%7Ccd%3D09%2FAPR%2F2025%7Ccmid%3D12%7Cutyp%3DP%7Cev%3DV%7Cuv%3DV%7Custs%3D%7Cadmln%3D0%7Cadmsales%3D0; xnHist=pv%3D0%7Cipv%3D2%7Cfpv%3D1%7Ccity%3D%7Ccvstate%3Dundefined%7Cpopupshown%3Dundefined%7Cinstall%3Dundefined%7Css%3DnotDisplayed%7Cmb%3Dundefined%7Ctm%3Dundefined%7Cage%3Dundefined%7Ccount%3D2%7Ctime%3DWed%20Apr%2009%202025%2010%3A23%3A20%20GMT+0530%20%28India%20Standard%20Time%29%7Cglid%3D29141067%7Cgname%3Dundefined%7Cgemail%3Dundefined%7CcityID%3Dundefined; _clsk=6n8vym%7C1744186321741%7C2%7C1%7Cw.clarity.ms%2Fcollect; FCNEC=%5B%5B%22AKsRol-UrcWleMCq70yw1RuKGqd5UR-AQtA1qQWRyUZCZL-w0nTg5oIIuUyWImbRp49nCkvI_mB1Th7mKinDvqUiLhbGvOiVFwGGHfx0KSrAZur2LLMBO0wIixGH-_9qjZQyEE4l3gLO00ObpyI2ntBkNSiEFajhOQ%3D%3D%22%5D%5D; sessid=spv=3; _ga_8B5NXMMZN3=GS1.1.1744186219.4.1.1744186325.17.0.0; __gads=ID=fc6c3ee8892a976d:T=1744105133:RT=1744186324:S=ALNI_MYPUHS2vdhtPaRzMvF6CKkn_REMiw; __gpi=UID=000010915248adad:T=1744105133:RT=1744186324:S=ALNI_Ma-AR4FCmwX5H1ILbVdw85sq0ZqPw; __eoi=ID=7533d0ffab5e62e3:T=1744105133:RT=1744186324:S=AA-AfjZqcY0dD1L5S3wxComCxsmP`,
});

module.exports = fetchLeads;
