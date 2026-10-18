# Injury Response (prototype)

A hackathon prototype for sports coaches dealing with a suspected concussion. It checks for red flags first, then walks through visible signs, symptoms, memory questions and an experimental camera tandem walk, shows what to do next, and keeps an incident record that can be shared as a report.

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

## Offline use

After the app has been opened once with signal, it also opens with no signal. `sw.js` (a service worker) keeps a copy of the app files on the phone.

How updates work:

- With signal, the app always asks GitHub for the newest files first and saves them as the new copy. There is no version number to bump. Merge, wait for Pages, then close and reopen the app as before.
- With no signal, or if the network takes more than 3 seconds, the app opens from the saved copy. It picks up the newest version next time it opens with signal.
- If you add a new file the app needs, such as a new script, add its path to the `FILES` list at the top of `sw.js` so it is saved for offline use.
- Incident records are not part of this copy and are never touched by updates.
- The tandem walk's body-tracking library and model come from outside sites (jsDelivr and Google), so they are not in this copy. The browser usually keeps them after the first use, but the walk may need signal.

## Tandem walk (camera)

The coach films the player from about 4 meters away. The player takes 5 heel-to-toe steps toward the camera, turns, and takes 5 back. Google's MediaPipe Pose model tracks 33 body points on the phone, and `js/walk.js` turns those points into flags:

- **Stumble:** the ankles spread sideways off the line for at least 150 ms.
- **Sway:** the trunk leans more than 15 degrees sideways for at least 300 ms.
- **Fall:** the trunk leans more than 50 degrees, or the hips drop near ankle height, for at least 300 ms.

The turn in the middle is not judged. Any flag counts toward "Concussion suspected", the same as the coach ticking a balance problem. A clean walk never lowers the result.

These limits are first guesses. Before anyone relies on them, record teammates walking normally and deliberately wobbling, and adjust `WALK_THRESHOLDS` at the top of `js/walk.js`. Video is never recorded, saved or uploaded; only the measurements are kept.

## Test it

Open `tests/index.html`. It runs checks on the result rules, the reports and storage, and lists anything that fails. Run it after every change to `js/`.

## Files

| File | What it does |
| --- | --- |
| `js/protocols/concussion.js` | All guidance text: red flags, signs, symptoms, memory questions, next steps, sources, and the emergency number (911). This is the file a healthcare professional needs to review. |
| `js/assessment.js` | The rules that turn what the coach ticked into a result. |
| `js/walk.js` | Turns tracked body points from the tandem walk into stumble, sway and fall flags. |
| `js/pose.js` | Loads the MediaPipe body-tracking model and draws the skeleton. |
| `js/records.js` | Saves incident records in the browser (`localStorage`). |
| `js/reports.js` | Builds the report text for each type of recipient. |
| `js/app.js` | Screens, navigation and form handling. |
| `css/styles.css` | Styles. |
| `sw.js` | Service worker that saves the app files so the app opens offline. |
| `tests/` | The test page. |

## What works and what doesn't

Working:

- Opening screen with Start check, Incidents on this device, and About this prototype
- Red flag check first. If any red flag is ticked, Next skips straight to the result with the emergency instructions
- Visible signs, symptoms and memory questions, based on the Concussion Recognition Tool 6
- An optional tandem walk filmed with the phone camera, with a live skeleton overlay and stumble, sway and fall detection
- A result with the reasons behind it and its limitations, plus next steps and danger signs
- Recording actions (removed from play, parent told, and so on) with the time each was done
- Incident details, review, editing until the record is finalized, follow-up notes after it
- Separate reports for parents, medical staff and team staff, with copy and share

Not real yet:

- **The result comes from simple rules.** They're applied to what the coach ticks and to the walk flags, and the result is labeled as experimental in the app.
- **The walk detection is untested on real players.** Body tracking is real, but the limits for what counts as a stumble, sway or fall are first guesses.
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
