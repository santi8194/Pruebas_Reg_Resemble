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

      data[scenario][step][version === "3.41.1" ? 0 : 1] = file;

      // if both versions of the file have been found, compare them and store the result
      if (data[scenario][step][0] && data[scenario][step][1]) {
        const comparison = await compareImages(
          fs.readFileSync(
            `./screenshots_10_scenarios/${data[scenario][step][0]}`
          ),
          fs.readFileSync(
            `./screenshots_10_scenarios/${data[scenario][step][1]}`
          ),
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
        fs.writeFileSync(
          `./screenshots_10_scenarios/P${scenario}.${step} compare.png`,
          comparison.getBuffer()
        );
        data[scenario][step][2] = `P${scenario}.${step} compare.png`;
      }
    }
  }

  fs.writeFileSync(`./report/report.html`, createReport(data));
  fs.copyFileSync("./index.css", `./report/index.css`);

  return data;
}
(async () => await executeTest())();

function createReport(data) {
  const renderStepInfo = (key, value) => `
  <tr>
    <td>${key}</td>
    <td>${JSON.stringify(value)}</td>
  </tr>`;

  const testPass = (rawMisMatchPercentage) => {
    if (rawMisMatchPercentage > 5) {
      return "callout-failed ps-4 mb-5";
    } else {
      return "callout-success ps-4 mb-5";
    }
  };

  const renderStep = (key, step) => `
  <div class="${testPass(step[3].rawMisMatchPercentage)}">
    <h3>Paso: ${key}</h3>
    <table class="table mt-3">
      <thead>
        <tr>
          <th scope="col">Propiedad</th>
          <th scope="col">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(step[3])
          .map(([key, value]) => renderStepInfo(key, value))
          .join("")}
      </tbody>
    </table>    
    <div class="container-fluid">
      <div class="row col mt-3">
        <div class="col-4">
          <p class="fw-semibold fs-5 text">3.41.1</p>
          <img src="../screenshots_10_scenarios/${step[0]}">
        </div>
        <div class="col-4">
          <p class="fw-semibold fs-5 text">4.44.0</p>
          <img src="../screenshots_10_scenarios/${step[1]}">
        </div>
        <div class="col-4">
          <p class="fw-semibold fs-5 text">Comparación</p>
          <img src="../screenshots_10_scenarios/${step[2]}">
        </div>      
      </div>
    </div>
  </div>`;

  const renderScenario = (key, steps) => `
  <div class="accordion-item">
    <h2 class="accordion-header">
      <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${key}" aria-expanded="true" aria-controls="collapse${key}">
        Escenario ${key}
      </button>
    </h2>
    <div id="collapse${key}" class="accordion-collapse collapse show" data-bs-parent="#ScenariosAccordion">
      <div class="accordion-body">
      ${Object.entries(steps)
        .map(([key, step]) => renderStep(key, step))
        .join("")}
      </div>
    </div>
  </div>`;

  return `
  <!DOCTYPE html>
  <html>
      <head>
      <title>Pruebas de Regresión Ghost</title>
      <link rel="stylesheet" type="text/css" href="index.css">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-KK94CHFLLe+nY2dmCWGMq91rCGa5gtU4mk92HdvYe+M/SXH301p5ILy+dN9+nJOZ" crossorigin="anonymous">
    </head>
    <body>
      <div class="container">
        <h2 class="mb-4 mt-5">Pruebas de Regresión Ghost</h2>
          <div class="accordion" id="ScenariosAccordion">
            ${Object.keys(data)
              .sort()
              .map((key) => renderScenario(key, data[key]))
              .join("")}
          </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ENjdO4Dr2bkBIFxQpeoTz1HIcje39Wm4jDKdf19U8gI4ddQ3GYNS7NTKfAdVQSZe" crossorigin="anonymous"></script>
    </body>
  </html>`;
}
