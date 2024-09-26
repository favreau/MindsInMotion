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

let particles = [];
let noiseSlider; // Slider to control random movement noise
let powerOfLoveSlider; // Slider to control influence strength (Power of Love)
let attractionDistance; // Slider to control influence strength (Power of Love)
let influenceDistance; // Slider to control influence strength (Power of Love)
let speed = 0.01;
let maxSpeed = 5.0;
let uiVerticalOffset = 50;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Create a slider for controlling noise (randomness in movement)
  noiseSlider = createSlider(0, 1, 0.01, 0.01); // min 0, max 1, initial value 0.1, step 0.01
  noiseSlider.position(10, uiVerticalOffset + 20); // Position it on the canvas
  noiseSlider.style("width", "200px");

  // Create a slider for controlling the influence strength (Power of Love)
  powerOfLoveSlider = createSlider(0, 10, 1, 0.1); // min 0, max 10, initial value 1, step 0.1
  powerOfLoveSlider.position(10, uiVerticalOffset + 70); // Position it below the noise slider
  powerOfLoveSlider.style("width", "200px");

  // Create a slider for controlling the influence strength (Power of Love)
  attractionDistanceSlider = createSlider(0, 500, 150, 0.1); // min 0, max 10, initial value 1, step 0.1
  attractionDistanceSlider.position(10, uiVerticalOffset + 120); // Position it below the noise slider
  attractionDistanceSlider.style("width", "200px");

  // Create a slider for controlling the influence strength (Power of Love)
  influenceDistanceSlider = createSlider(0, 500, 100, 0.1); // min 0, max 10, initial value 1, step 0.1
  influenceDistanceSlider.position(10, uiVerticalOffset + 170); // Position it below the noise slider
  influenceDistanceSlider.style("width", "200px");

  // Create the particles
  for (let i = 0; i < 100; i++) {
    particles.push(new Particle());
  }
}

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

  // Update and display particles
  for (let p of particles) {
    p.move();
    p.display();
    p.interact(particles);
  }
}

// Particle class representing a neuron
class Particle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.vx = random(-1, 1) * speed;
    this.vy = random(-1, 1) * speed;
    this.size = random(10, 20);
    this.color = color(random(1, 255), random(1, 255), random(1, 255));
    this.charge = random(-1, 1); // Charge can be between -1 and 1 (positive or negative)
  }

  // Move the particle with added randomness and attraction
  move() {
    // Get the current noise value from the slider
    let noiseLevel = noiseSlider.value();

    // Adding random movement (noise) for less predictable paths, influenced by slider value
    this.vx += random(-noiseLevel, noiseLevel) * speed;
    this.vy += random(-noiseLevel, noiseLevel) * speed;
    this.vx = min(maxSpeed, this.vx);
    this.vy = min(maxSpeed, this.vy);

    // Keep particles moving within canvas bounds
    this.x += this.vx;
    this.y += this.vy;

    if (this.x > width || this.x < 0) this.vx *= -1;
    if (this.y > height || this.y < 0) this.vy *= -1;
  }

  // Display the particle
  display() {
    fill(this.color);
    noStroke();
    ellipse(this.x, this.y, this.size);
  }

  // Interaction with other particles
  interact(others) {
    for (let other of others) {
      if (other !== this) {
        let d = dist(this.x, this.y, other.x, other.y);

        // Attraction force: The closer the particles, the stronger the pull
        let attractionDistance = attractionDistanceSlider.value();
        if (d < attractionDistance) {
          // Attraction range
          let attractionForce = map(d, 0, attractionDistance, 0.1, 0); // Force gets weaker with distance
          this.vx += (other.x - this.x) * attractionForce * 0.01;
          this.vy += (other.y - this.y) * attractionForce * 0.01;
        }

        let influenceDistance = influenceDistanceSlider.value();
        if (d < influenceDistance) {
          // Interaction range for color influence
          // Get the Power of Love multiplier from the slider
          let powerOfLove = powerOfLoveSlider.value() * 0.1;

          // Influence color based on distance, charge, and power of love
          let influenceStrength = map(d, 0, 100, abs(other.charge), 0); // Stronger influence when closer

          if (other.charge > 0) {
            // Positive influence: make the other particle brighter based on charge, distance, and Power of Love
            this.color = lerpColor(
              this.color,
              other.color,
              influenceStrength * powerOfLove * 0.05
            );
            // this.color = this.color * influenceStrength + other.color * (1.0 - influenceStrength);
          } else {
            // Negative influence: make the other particle darker based on charge, distance, and Power of Love
            this.color = lerpColor(
              this.color,
              color(0, 0, 0),
              influenceStrength * 0.001
            );
            // this.color = this.color * 0.99;
          }
        }
      }
    }
  }
}
