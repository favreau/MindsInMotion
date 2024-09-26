/*
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

   Author: Cyrille Favreau (cyrille.favreau@gmail.com)
*/

const gpu = new GPU();

// Global variables
let particles = [];
let noiseSlider,
  powerOfLoveSlider,
  attractionDistanceSlider,
  influenceDistanceSlider;
const numParticles = 5000;
const maxSpeed = 1.0;
const recoverySpeed = 0.0001;
let uiVerticalOffset = 50;

// Separate arrays for GPU computations
let particlePositions = [];
let particleColors = [];
let particleOriginalColors = [];
let particleCharges = [];
let velocities = [];

function preload() {
  // Load the image
  img = loadImage("./image.jpg"); // Replace with the actual path to your image
}

// Setup function to initialize sliders and particles
function setup() {
  createCanvas(windowWidth, windowHeight);

  img.resize(width, height);

  // Sliders for user control
  noiseSlider = createSlider(0, 10, 1, 0.1);
  noiseSlider.position(10, uiVerticalOffset + 20); // Position it on the canvas
  noiseSlider.style("width", "200px");

  powerOfLoveSlider = createSlider(0, 1, 0.5, 0.1);
  powerOfLoveSlider.position(10, uiVerticalOffset + 70); // Position it below the noise slider
  powerOfLoveSlider.style("width", "200px");

  attractionDistanceSlider = createSlider(0, 50, 25, 1);
  attractionDistanceSlider.position(10, uiVerticalOffset + 120); // Position it below the noise slider
  attractionDistanceSlider.style("width", "200px");

  influenceDistanceSlider = createSlider(0, 100, 50, 1);
  influenceDistanceSlider.position(10, uiVerticalOffset + 170); // Position it below the noise slider
  influenceDistanceSlider.style("width", "200px");

  // Create particles and initialize arrays for GPU processing
  for (let i = 0; i < numParticles; i++) {
    let x = random(width);
    let y = random(height);
    let charge = random(-0.25, 1.0);
    // let color = [random(255), random(255), random(255)];
    let color = img.get(x, y);
    particles.push({ x, y, color, charge });
    particlePositions.push([x, y]);
    particleColors.push(color);
    particleOriginalColors.push(color);
    particleCharges.push(charge);
    velocities.push([random(-1, 1), random(-1, 1)]);
  }
}

// GPU Kernel to handle particle movement
const moveParticles = gpu
  .createKernel(function (
    positions,
    velocities,
    charges,
    noise,
    attractionDistance,
    width,
    height
  ) {
    const x1 =
      positions[this.thread.x][0] + velocities[this.thread.x][0] * noise;
    const y1 =
      positions[this.thread.x][1] + velocities[this.thread.x][1] * noise;

    let vx = velocities[this.thread.x][0];
    let vy = velocities[this.thread.x][1];

    for (let i = 0; i < this.constants.numParticles; i++) {
      if (i !== this.thread.x) {
        const x2 = positions[i][0];
        const y2 = positions[i][1];
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (dist < attractionDistance) {
          // Attraction range
          let attractionForce =
            ((attractionDistance - dist) / attractionDistance) *
            abs(charges[i]);
          vx += (x2 - x1) * attractionForce * 0.01;
          vy += (y2 - y1) * attractionForce * 0.01;

          vx = min(this.constants.maxSpeed, vx);
          vy = min(this.constants.maxSpeed, vy);
        }
      }
    }

    if (x1 > width || x1 < 0) vx = -vx;
    if (y1 > height || y1 < 0) vy = -vy;

    return [x1, y1, vx, vy];
  })
  .setOutput([numParticles])
  .setConstants({ numParticles, maxSpeed });

// GPU Kernel to handle particle interactions
const interactParticles = gpu
  .createKernel(function (
    positions,
    colors,
    originalColors,
    charges,
    influenceDistance,
    powerOfLove
  ) {
    const index = this.thread.x;
    const x1 = positions[index][0];
    const y1 = positions[index][1];
    let r = colors[index][0];
    let g = colors[index][1];
    let b = colors[index][2];
    let orR = originalColors[index][0];
    let orG = originalColors[index][1];
    let orB = originalColors[index][2];

    for (let i = 0; i < this.constants.numParticles; i++) {
      if (i !== this.thread.x) {
        const x2 = positions[i][0];
        const y2 = positions[i][1];
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

        if (dist < influenceDistance) {
          let or = colors[i][0];
          let og = colors[i][1];
          let ob = colors[i][2];

          const charge = charges[i];
          const influenceStrength =
            ((influenceDistance - dist) / influenceDistance) * powerOfLove;

          const a = influenceStrength * powerOfLove;
          if (charge > 0) {
            r = r * (1 - a) + or * a;
            g = g * (1 - a) + og * a;
            b = b * (1 - a) + ob * a;
          } else {
            r = r * (1 - a);
            g = g * (1 - a);
            b = b * (1 - a);
          }
        } else {
          const a = this.constants.recoverySpeed;
          r = r * (1 - a) + orR * a;
          g = g * (1 - a) + orG * a;
          b = b * (1 - a) + orB * a;
        }
      }
    }

    return [r, g, b];
  })
  .setOutput([numParticles])
  .setConstants({ numParticles, recoverySpeed });

// Draw loop
function draw() {
  background(0);

  // Display the current noise and power of love values above the sliders
  fill(255);
  textSize(12);
  text(
    "Random Movement    : " + noiseSlider.value(),
    10,
    uiVerticalOffset + 10
  );
  text(
    "Power of Love      : " + powerOfLoveSlider.value(),
    10,
    uiVerticalOffset + 60
  );
  text(
    "Attraction distance: " + attractionDistanceSlider.value(),
    10,
    uiVerticalOffset + 110
  );
  text(
    "Influence distance : " + influenceDistanceSlider.value(),
    10,
    uiVerticalOffset + 160
  );

  // Get slider values
  const noise = noiseSlider.value();
  const powerOfLove = powerOfLoveSlider.value();
  const attractionDistance = attractionDistanceSlider.value();
  const influenceDistance = influenceDistanceSlider.value();

  // Move particles using the GPU
  const movedParticles = moveParticles(
    particlePositions,
    velocities,
    particleCharges,
    noise,
    attractionDistance,
    width,
    height
  );
  particlePositions = movedParticles.map((p) => [p[0], p[1]]);
  velocities = movedParticles.map((p) => [p[2], p[3]]);

  // Interact particles using the GPU
  const newColors = interactParticles(
    particlePositions,
    particleColors,
    particleOriginalColors,
    particleCharges,
    influenceDistance,
    powerOfLove
  );
  particleColors = newColors.map((c) => [c[0], c[1], c[2]]);

  // Draw particles on the canvas
  for (let i = 0; i < numParticles; i++) {
    fill(particleColors[i][0], particleColors[i][1], particleColors[i][2]);
    noStroke();
    ellipse(
      particlePositions[i][0],
      particlePositions[i][1],
      5.0 + 10.0 * abs(particleCharges[i])
    );
  }
}
