const compareImages = require("resemblejs/compareImages");
const config = require("./config.json");
const fs = require("fs");

const { options } = config;

async function executeTest() {
  const screenshots = fs.readdirSync(`./screenshots_10_scenarios`);
  const data = {}; // create an empty object to store the results

// iterate over the list of files
  for (let i = 0; i < screenshots.length; i++) {
    const file = screenshots[i];

    // use a regular expression to extract the scenario, step, and version from the file name
    const match = file.match(/^P(\d\d)\.(\d\d?\s.+)\sv(\d\.\d\d\.\d)\.png$/);
    if (match) {
      const scenario = match[1];
      const step = match[2];
      const version = match[3];

      data[scenario] = data[scenario] || {};
      data[scenario][step] = data[scenario][step] || [null, null];

      data[scenario][step][version === '3.41.1' ? 0 : 1] = file;

      // if both versions of the file have been found, compare them and store the result
      if (data[scenario][step][0] && data[scenario][step][1]) {
        const comparison = await compareImages(
            fs.readFileSync(`./screenshots_10_scenarios/${data[scenario][step][0]}`),
            fs.readFileSync(`./screenshots_10_scenarios/${data[scenario][step][1]}`),
            options
        );
        data[scenario][step][3] = {
          isSameDimensions: comparison.isSameDimensions,
          dimensionDifference: comparison.dimensionDifference,
          rawMisMatchPercentage: comparison.rawMisMatchPercentage,
          misMatchPercentage: comparison.misMatchPercentage,
          diffBounds: comparison.diffBounds,
          analysisTime: comparison.analysisTime,
        };
        fs.writeFileSync(`./screenshots_10_scenarios/P${scenario}.${step} compare.png`, comparison.getBuffer());
        data[scenario][step][2] = `P${scenario}.${step} compare.png`
      }
    }
  }

  fs.writeFileSync(
    `./screenshots_10_scenarios/report.html`,
    createReport(data)
  );
  fs.copyFileSync("./index.css", `./screenshots_10_scenarios/index.css`);

  return data;
}
(async () => await executeTest())();

function createReport(data) {


  const renderStep = (key, step) =>`<li>${key}<span>${JSON.stringify(step[3])}</span><div class="images-container">
<img src="./${step[0]}">
<img src="./${step[2]}">
<img src="./${step[1]}">
</div></li>`

  const renderScenario = (key, steps) => `<div class="accordion">Escenario ${key}</div>
  <div class="panel">
  <ul>
        ${Object.entries(steps).map(([key,step]) => renderStep(key, step)).join("")}
</ul>
  </div>`

  return `<!DOCTYPE html>
  <html>
  <head>
  <title>Accordion Example</title>
  <link rel="stylesheet" type="text/css" href="index.css">
  </head>
  <body>

  <h2>Pruebas de Regresión Ghost</h2>

        ${Object.keys(data).sort().map((key) => renderScenario(key, data[key])).join("")}

  <script>
    // Add click event listener to all accordion elements
    var acc = document.getElementsByClassName("accordion");
    for (var i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
      // Toggle active class to selected accordion element
      this.classList.toggle("active");
      // Get sibling panel element and toggle its visibility
      var panel = this.nextElementSibling;
      if (panel.style.maxHeight) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  }
  </script>

  </body>
</html>`;
}