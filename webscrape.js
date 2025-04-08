const { test, expect, chromium } = require("@playwright/test");
const moment = require("moment");
const fs = require("fs/promises");
const path = require("path");

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

  // Combine extracted date with the time if available
  if (matchTime) {
    const timePart = matchTime[0];
    const [hours, minutes] = timePart.split(/[: ]/).map(Number);
    const isPM = timePart.includes("PM");

    extractedDate.setHours(isPM ? hours + 12 : hours, minutes);
  }

  return extractedDate.toISOString();
}
//splitViewContactList
async function scrollToLoadAllLeads(page) {
  // const scrollableContainerSelector = ".ReactVirtualized__Grid";
  const scrollableContainerSelector =
    "#splitViewContactList .ReactVirtualized__Grid";
  const leadsSelector = ".list .row";
  const leadsData = [];
  let previousLeadCount = 0;
  let scrollAttempts = 0;
  let maxNoNewLeadsScrolls = 5; // Stop after this many attempts with no new leads
  let noNewLeadsCounter = 0;
  const scrollDelay = 2000; // Delay between scrolls

  await delay(5000);
  console.log("scrollableContainerSelector...", scrollableContainerSelector);
  // Wait for the scrollable container to load
  await page.waitForSelector(scrollableContainerSelector, { timeout: 30000 });
  console.log("Scrollable container found.");

  while (true) {
    // Get all visible leads in the current view
    const currentLeadsData = await page.evaluate(
      ({ scrollableContainerSelector, leadsSelector }) => {
        const container = document.querySelector(scrollableContainerSelector);
        if (!container) {
          throw new Error("Scrollable container not found.");
        }

        const leads = document.querySelectorAll(leadsSelector);

        return Array.from(leads).map((lead) => {
          const dateTimeElement = lead.querySelector(".fr .fs12.clr77");
          const dateTime = dateTimeElement
            ? dateTimeElement.innerText.trim()
            : "N/A";

          // Clone the element and remove the date/time to avoid including it in details
          const detailsClone = lead.cloneNode(true);
          if (dateTimeElement) {
            dateTimeElement.remove();
          }

          return {
            id:
              lead.getAttribute("data-id") ||
              lead.querySelector(".wrd_elip")?.innerText?.trim() ||
              "N/A",
            name: lead.querySelector(".wrd_elip")?.innerText?.trim() || "N/A",
            productName:
              lead.querySelector(".wrd_elip .prod-name")?.innerText?.trim() ||
              "N/A",
            startDate: "N/A", // Storing extracted date/time separately
            dateTime,
            details:
              detailsClone.innerText.trim().replace(dateTime, "") || "N/A", // Excluding date/time from details
            elementIndex: [
              ...container.querySelectorAll(leadsSelector),
            ].indexOf(lead),
          };
        });
      },
      { scrollableContainerSelector, leadsSelector }
    );

    console.log(`Found ${currentLeadsData.length} leads in the current view.`);

    let newLeadsAdded = false;

    for (const lead of currentLeadsData) {
      if (leadsData.some((l) => l.id === lead.id)) {
        continue; // Skip already processed leads
      }

      lead.startDate = extractISODate(lead.dateTime);

      newLeadsAdded = true;

      try {
        // Click the lead using a robust locator
        const leadElement = await page
          .locator(`.wrd_elip:has-text("${lead.name}")`)
          .first();
        await leadElement.scrollIntoViewIfNeeded(); // Scroll to make it visible
        await leadElement.click();
        console.log(`Clicked on lead: ${lead.name}`);
        await page.waitForTimeout(1000); // Short delay for the page to stabilize

        // Fetch label
        try {
          const labelLocator = page
            .locator("#splitviewlabelheader .wrd_elip")
            .first();
          if ((await labelLocator.count()) > 0) {
            lead.label = await labelLocator
              .innerText()
              .then((text) => text.trim());
            console.log(`Fetched label: ${lead.label}`);
          } else {
            lead.label = "N/A";
          }
        } catch (error) {
          console.error(`Error fetching label for ${lead.name}:`, error);
        }

        // Fetch mobile number
        try {
          const mobileElement = page.locator("#headerMobile");
          if ((await mobileElement.count()) > 0) {
            await mobileElement.click();
            await page.waitForTimeout(500);
            const mobileNumber = await page.evaluate(async () => {
              return await navigator.clipboard.readText();
            });

            if (mobileNumber && !isNaN(Number(mobileNumber))) {
              lead.mobile = mobileNumber;
              console.log(`Fetched mobile: ${lead.mobile}`);
            } else {
              lead.mobile = "N/A";
              console.log(`No valid mobile number copied for ${lead.name}`);
            }
          }
        } catch (error) {
          console.error(
            `Error fetching mobile number for ${lead.name}:`,
            error
          );
        }
        // **New Email Fetching Logic**
        try {
          const emailElement = page.locator("#headerEmail");
          if ((await emailElement.count()) > 0) {
            await emailElement.click();
            await page.waitForTimeout(500);
            const email = await page.evaluate(
              async () => await navigator.clipboard.readText()
            );
            lead.email = email && email.includes("@") ? email : "N/A";
            console.log(`Fetched email: ${lead.email}`);
          } else {
            lead.email = "N/A";
            console.log(`No email found for ${lead.name}`);
          }
        } catch (error) {
          console.error(`Error fetching email for ${lead.name}:`, error);
          lead.email = "N/A";
        }

        try {
          const addressElement = page.locator("#headerAddress");
          if ((await addressElement.count()) > 0) {
            await addressElement.click();
            await page.waitForTimeout(500);
            const address = await page.evaluate(
              async () => await navigator.clipboard.readText()
            );
            lead.address = address ? address : "N/A";
            console.log(`Fetched address: ${lead.address}`);
          } else {
            lead.address = "N/A";
            console.log(`No address found for ${lead.name}`);
          }
        } catch (error) {
          console.error(`Error fetching address for ${lead.name}:`, error);
          lead.address = "N/A";
        }

        try {
          const contactNameElement = page.locator("#left-name");
          if ((await contactNameElement.count()) > 0) {
            await page.waitForTimeout(500);
            const contactName = await contactNameElement.textContent();
            lead.contactPerson = contactName ? contactName.trim() : "N/A";
            console.log(`Fetched contact person: ${lead.contactPerson}`);
          } else {
            lead.contactPerson = "N/A";
            console.log("No contact person name found");
          }
        } catch (error) {
          console.error("Error fetching contact person name:", error);
          lead.contactPerson = "N/A";
        }

        leadsData.push(lead);
      } catch (error) {
        console.error(`Error processing lead ${lead.name}:`, error);
        continue;
      }
    }

    if (newLeadsAdded) {
      noNewLeadsCounter = 0;
    } else {
      noNewLeadsCounter++;
      console.log(
        `No new leads found. Attempt ${noNewLeadsCounter} of ${maxNoNewLeadsScrolls}.`
      );
    }

    if (noNewLeadsCounter >= maxNoNewLeadsScrolls) {
      console.log(
        "Max scroll attempts with no new leads reached. Stopping scroll."
      );
      break;
    }

    // Scroll to load more leads
    const currentScrollHeight = await page.evaluate(
      (scrollableContainerSelector) => {
        const container = document.querySelector(scrollableContainerSelector);
        if (!container) {
          throw new Error("Scrollable container not found.");
        }
        const previousScrollTop = container.scrollTop;
        container.scrollBy(0, 10); // Scroll down by 10px
        return {
          scrollTop: container.scrollTop,
          maxScrollHeight: container.scrollHeight,
          previousScrollTop,
        };
      },
      scrollableContainerSelector
    );

    if (
      currentScrollHeight.scrollTop === currentScrollHeight.previousScrollTop &&
      currentScrollHeight.scrollTop + 10 >= currentScrollHeight.maxScrollHeight
    ) {
      console.log("Reached the bottom of the list. No more leads to process.");
      break;
    }

    previousLeadCount = leadsData.length;
    scrollAttempts++;
    console.log(`Scroll attempt ${scrollAttempts} completed.`);

    // Add a consistent delay between scroll attempts
    await page.waitForTimeout(scrollDelay);
  }

  console.log("All leads processed", leadsData);

  return leadsData;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchLeads = async ({
  mobileNumber,
  password,
  start_dayToSelect,
  start_monthToSelect,
  start_yearToSelect,
  end_dayToSelect,
  end_monthToSelect,
  end_yearToSelect,
  authKey,
}) => {
  console.log("In fetchLeads");
  const browser = await chromium.launch({ headless: false });

  console.log("authKey...", authKey);

  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"], // Enable clipboard access
  });
  const page = await context.newPage();

  try {
    if (authKey.length < 50 || !authKey || authKey.trim() === "") {
      //throw new Error("authKey is missing or empty");
      console.log("start manually login", mobileNumber);
      await page.goto("https://seller.indiamart.com/");
      console.log("Navigated to IndiaMART");
      await delay(2000); // Wait for 2 seconds

      await page
        .getByPlaceholder("Enter 10 digit mobile number")
        .fill(mobileNumber);
      await delay(1000);
      await page.getByRole("button", { name: "Start Selling" }).click();
      await delay(2000); // Wait for 2 seconds

      await page.getByRole("button", { name: "Enter Password" }).click();
      await page.getByPlaceholder("Enter Password").fill(password);
      console.log("Filled password");
      await delay(1000); // Wait for 1 second

      await page.getByRole("button", { name: "Sign In" }).click();
      console.log("Logged in successfully");
      await delay(3000);
    } else {
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
      console.log("Cookies loaded and added to browser context");

      // Navigate to IndiaMART
      await page.goto("https://seller.indiamart.com/");
      console.log("Navigated to IndiaMART");
      await delay(2000); // Wait for 2 seconds
    }

    // Close the popup if it appears
    const popupCloseButton = page.locator("button.nps-close.nps-toggle");

    try {
      await popupCloseButton.waitFor({ timeout: 5000 });
      await popupCloseButton.click();
      console.log("Popup closed successfully");
      await delay(1000);
    } catch (e) {
      console.log("Popup did not appear or already closed");
    }

    // Navigate to Lead Manager
    await page.getByRole("link", { name: "Lead Manager" }).click();
    console.log("Navigated to Lead Manager");
    await delay(3000); // Wait for 3 seconds

    // Open custom date filter
    await page.locator("#filterCTA").click();
    console.log("Clicked on filter");
    await delay(2000); // Wait for 2 seconds

    await page
      .getByText("Filters", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Filters", { exact: true }).click();
    await delay(1000); // Wait for 1 second

    await page
      .getByText("Select Date", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Select Date", { exact: true }).click();
    console.log("Clicked on 'Select Date'");
    await delay(1000); // Wait for 1 second

    await page
      .getByText("Custom Date", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Custom Date", { exact: true }).click();
    console.log("Opened custom date filter");
    await delay(2000); // Wait for 2 seconds

    // Wait for the date picker to be visible
    await page.waitForSelector("#custom_date_start", { timeout: 1000000 });
    await page.locator("#custom_date_start").scrollIntoViewIfNeeded();
    await delay(1000);
    await page.locator("#custom_date_start").click();
    console.log("Clicked on start date");

    // Select the desired month

    await page
      .locator(".rdrYearPicker select")
      .selectOption(`${start_yearToSelect}`);
    console.log("Selected year");
    await delay(1000);

    await page
      .locator(".rdrMonthPicker select")
      .selectOption(`${start_monthToSelect}`);
    console.log("Selected month");
    await delay(1000);
    // Select the desired year

    // Select the desired day

    await page
      .locator(`.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)`)
      .filter({
        hasText: `${start_dayToSelect}`,
      })
      .first()
      .click();
    console.log("Selected day");
    await delay(2000);

    if (
      start_yearToSelect !== end_yearToSelect ||
      start_monthToSelect !== end_monthToSelect ||
      start_dayToSelect !== end_dayToSelect
    ) {
      await page
        .locator(".rdrYearPicker select")
        .selectOption(`${end_yearToSelect}`);
      console.log("Selected year for end date");
      await delay(1000);
      await page
        .locator(".rdrMonthPicker select")
        .selectOption(`${end_monthToSelect}`);
      console.log("Selected month for end date");
      await delay(1000);
      await page
        .locator(`.rdrDay:not(.rdrDayPassive):not(.rdrDayDisabled)`)
        .filter({
          hasText: `${end_dayToSelect}`,
        })
        .first()
        .click();

      console.log("Selected day for end date");
      await delay(1000);
    }
    // Apply the filter
    await page
      .getByText("Apply", { exact: true })
      .waitFor({ state: "visible", timeout: 5000 });
    await page.getByText("Apply", { exact: true }).click();
    console.log("Applied custom date filter");
    await delay(5000);

    // Scroll to load all leads
    return await scrollToLoadAllLeads(page);

    // Example of using clipboard functionality
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
};

// fetchLeads({
//   // mobileNumber: "9892492782",
//   // password: "INDIAMART@2022",
//   start_dayToSelect: "25",
//   start_monthToSelect: "1", // April (0-based index: 0 : January, 1 : February, etc.)
//   start_yearToSelect: "2025",
//   end_dayToSelect: "25",
//   end_monthToSelect: "1", // April (0-based index: 0 : January, 1 : February, etc.)
//   end_yearToSelect: "2025",
//   authKey:
//     "_ga=GA1.1.731456266.1733395523; _ym_uid=1733395524885722337; _ym_d=1733395524; G_ENABLED_IDPS=google; __gads=ID=e766023d02bcba0a:T=1733458034:RT=1735295143:S=ALNI_MZn7lK5v21eiu4cuGhEvbWSEqGn-A; __gpi=UID=00000f84f4ad0299:T=1733458034:RT=1735295143:S=ALNI_MYi2lYYJqn2C5d6a7dMmK6Qnnw5yw; __eoi=ID=3d2bdd337b72cf30:T=1733458034:RT=1735295143:S=AA-AfjY27gM_4cKTmPS3Z2BicRBi; sortby=0#29141067; _gcl_au=1.1.1769895048.1741757506; iploc=gcniso%3DIN%7Cgcnnm%3DIndia%7Cgctnm%3DPune%7Cgctid%3D70630%7Cgacrcy%3D200%7Cgip%3D106.220.135.249%7Cgstnm%3DMaharashtra; LGNSTR=0%2C2%2C0%2C1%2C1%2C1%2C1%2C0; _clck=1dnfq7m%7C2%7Cfuv%7C0%7C1800; _ym_isad=2; FCNEC=%5B%5B%22AKsRol-XJcNyPN93Elpcusvi-r19-j4bF9xhlPhgtRbztZDnwkM_ltQ-kIqB1SwvC1BR0OqX_6HQ4VaGGOctZFqLr1yzw-BxD6t22iWkY2SpxbvdlJgAB5MajQpNQOrIl89JyzjT3o0ueyAmfylKTt0e3xqfyMW4Hg%3D%3D%22%5D%5D; _ym_visorc=b; im_iss=t%3DeyJ0eXAiOiJKV1QiLCJhbGciOiJzaGEyNTYifQ.eyJpc3MiOiJVU0VSIiwiYXVkIjoiOSo5KjQqMio4KiIsImV4cCI6MTc0NDA5MzA1OSwiaWF0IjoxNzQ0MDA2NjU5LCJzdWIiOiIyOTE0MTA2NyIsImNkdCI6IjA3LTA0LTIwMjUifQ.XCHZVBVV3qKjhlZ92GMWMgz7Xel470oPAcqW8-zKziY; userDet=glid=29141067|loc_pref=4|fcp_flag=1|image=http://5.imimg.com/data5/SELLER/GlPhoto/2023/12/364896082/FM/MF/ZG/29141067/colour-logo-64x64.jpg|service_ids=326,233,355,228|logo=https://5.imimg.com/data5/SELLER/Logo/2024/6/424491046/CK/YZ/KD/29141067/new-logo-kip-90x90.jpg|psc_status=0|d_re=|u_url=https://www.indiamart.com/kip-chemicals-mumbai/|ast=A|lst=LST|ctid=70624|ct=Mumbai|stid=6489|st=Maharashtra|enterprise=0|mod_st=F|rating=4.6|nach=0|iec=AAHCK7941A|is_suspect=0|vertical=KCD|pns_no=8047763552|gst=27AAHCK7941A1ZL|pan=AAHCK7941A|cin=U51900MH2019PTC330444|collectPayments=0|is_display_invoice_banner=0|is_display_enquiry=0|is_display_credit=0|disposition=|disp_date=|recreateUserDetCookie=|vid=|did=|fid=|src_ID=3|locPref_enable=1; ImeshVisitor=fn%3DSachin%7Cem%3Ds%2A%2A%2A%2A%2A%2A%2A%2A%2A%2A%40kip.co.in%7Cphcc%3D91%7Ciso%3DIN%7Cmb1%3D9892492782%7Cctid%3D70624%7Cglid%3D29141067%7Ccd%3D07%2FAPR%2F2025%7Ccmid%3D12%7Cutyp%3DP%7Cev%3DV%7Cuv%3DV%7Custs%3D%7Cadmln%3D0%7Cadmsales%3D0; xnHist=pv%3D0%7Cipv%3D78%7Cfpv%3D2%7Ccity%3Dundefined%7Ccvstate%3Dundefined%7Cpopupshown%3Dundefined%7Cinstall%3Dundefined%7Css%3Dundefined%7Cmb%3Dundefined%7Ctm%3Dundefined%7Cage%3Dundefined%7Ccount%3D0%7Ctime%3DMon%20Apr%2007%202025%2009%3A37%3A24%20GMT%2B0530%20(India%20Standard%20Time)%7Cglid%3D29141067%7Cgname%3Dundefined%7Cgemail%3Dundefined; _clsk=18z2lk8%7C1744006663477%7C3%7C1%7Cj.clarity.ms%2Fcollect; sessid=spv=4; _ga_8B5NXMMZN3=GS1.1.1744006521.86.1.1744006664.55.0.0",
// });

// fetchLeads({
//   mobileNumber: "9892492782",
//   password: "INDIAMART@2022",
//   start_dayToSelect: "25",
//   start_monthToSelect: "1", // April (0-based index: 0 : January, 1 : February, etc.)
//   start_yearToSelect: "2025",
//   end_dayToSelect: "25",
//   end_monthToSelect: "1", // April (0-based index: 0 : January, 1 : February, etc.)
//   end_yearToSelect: "2025",
// });

module.exports = fetchLeads;
