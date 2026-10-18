# Injury Response (prototype)

A hackathon prototype for sports coaches dealing with a suspected concussion. It checks for red flags first, then walks through visible signs, symptoms and memory questions, shows what to do next, and keeps an incident record that can be shared as a report.

**This is not a medical device.** It cannot diagnose a concussion or rule one out. The guidance text has not been reviewed by a qualified healthcare professional yet.

## Run it

There is nothing to install and no build step. Open `index.html` in Chrome, Edge, Firefox or Safari.

The camera needs a secure page. It works from `localhost` or an `https://` address (for example GitHub Pages). On a phone, use the HTTPS version.

## Put it on an Android phone

1. Merge the code into `main` on GitHub.
2. On GitHub, open **Settings > Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick **main** and **/ (root)**, then **Save**. After a minute or two the page shows the site address, which should be `https://spectrumify.github.io/MatiasKaleb/`.
3. On the phone, open that address in Chrome. Tap the **three-dot menu**, then **Add to Home screen** or **Install app**.
4. The app now has its own icon and opens without the browser bar. Records stay on that phone.

Every change merged into `main` goes live within a few minutes. Close and reopen the app to get it.

## Test it

Open `tests/index.html`. It runs checks on the result rules, the reports and storage, and lists anything that fails. Run it after every change to `js/`.

## Files

| File | What it does |
| --- | --- |
| `js/protocols/concussion.js` | All guidance text: red flags, signs, symptoms, memory questions, next steps, sources, and the emergency number (911). This is the file a healthcare professional needs to review. |
| `js/assessment.js` | The rules that turn what the coach ticked into a result. |
| `js/records.js` | Saves incident records in the browser (`localStorage`). |
| `js/reports.js` | Builds the report text for each type of recipient. |
| `js/app.js` | Screens, navigation and form handling. |
| `css/styles.css` | Styles. |
| `tests/` | The test page. |

## What works and what doesn't

Working:

- Opening screen with Start check, Incidents on this device, and About this prototype
- Red flag check first. If any red flag is ticked, Next skips straight to the result with the emergency instructions
- Visible signs, symptoms and memory questions, based on the Concussion Recognition Tool 6
- A result with the reasons behind it and its limitations, plus next steps and danger signs
- Recording actions (removed from play, parent told, and so on) with the time each was done
- Incident details, review, editing until the record is finalized, follow-up notes after it
- Separate reports for parents, medical staff and team staff, with copy and share

Not real yet:

- **The result is not AI.** It comes from simple rules applied to what the coach ticks. It is labeled as experimental in the app.
- **The camera is a preview only.** No video is recorded, saved or analyzed.
- **Records live in one browser.** There are no accounts, no syncing between devices, and no access control. Clearing browser data deletes them.
- **Sharing goes through the coach.** Reports are copied or sent with the phone's share menu. There is no secure delivery to named recipients.

## Before any real-world use

- A qualified healthcare professional reviews everything in `js/protocols/concussion.js`.
- Any automated assessment, especially video analysis, is clinically validated before anyone relies on it.
- Records move to a server with accounts, access control, encryption, consent records and a data retention policy. Player injury data is sensitive health information, often about minors.
- A legal review covers medical device rules and health and children's privacy laws where the app will be used.
- The emergency number is changed for countries that don't use 911.

## Sources

- Concussion Recognition Tool 6 (CRT6). Concussion in Sport Group, 2023. Echemendia RJ, et al. Br J Sports Med 2023;57:619.
- CDC HEADS UP concussion materials for coaches.
