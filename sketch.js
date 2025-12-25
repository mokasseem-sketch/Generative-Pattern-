let cols, rows, logoMask;
let angleSlider, strokeOutSlider, strokeInSlider, densitySlider, powerSlider, scaleSlider;
let posXSlider, posYSlider, logoScaleSlider; 
let bgPicker, fgPicker, shapeSelect;
let inputW, inputH, mic, isAudioEnabled = false, isAIThinking = false;

// الثوابت الأساسية
let minLH = 8, maxLH = 25, minLW = 2, maxLW = 7;
let maxAngle = Math.PI / 4;

const OPENAI_API_KEY = "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";

function preload() {
  logoMask = loadImage("logo.png"); 
}

function setup() {
  let canvas = createCanvas(1080, 1080, SVG);
  canvas.parent(document.body);
  pixelDensity(1);
  rectMode(CENTER);

  let ctrl = select('#controls');

  // 1. التحكم في المقاسات اليدوية
  let sizeGroup = createDiv().parent(ctrl).addClass('control-group');
  createSpan("📏 Canvas Size (W x H)").parent(sizeGroup);
  let rowInputs = createDiv().parent(sizeGroup).style('display','flex').style('gap','5px');
  inputW = createInput('1080').parent(rowInputs).style('width','60px');
  inputH = createInput('1080').parent(rowInputs).style('width','60px');
  createButton('Apply Size').parent(sizeGroup).mousePressed(updateCanvasSize);

  // 2. رفع اللوجو والذكاء الاصطناعي
  let aiGroup = createDiv().parent(ctrl).addClass('control-group');
  createSpan("📁 Upload & AI Prompt").parent(aiGroup);
  createFileInput(handleFile).parent(aiGroup);
  let aiInput = createInput('').attribute('placeholder', 'Describe motion...').parent(aiGroup);
  createButton('AI Apply').parent(aiGroup).style('background','#3498db').mousePressed(() => askAI(aiInput.value()));

  // 3. تحريك وتغيير حجم اللوجو (No Stretch)
  let posGroup = createDiv().parent(ctrl).addClass('control-group');
  createSpan("📍 Logo Pos & Scale").parent(posGroup);
  posXSlider = createSlider(-1500, 1500, 0, 1).parent(posGroup);
  posYSlider = createSlider(-1500, 1500, 0, 1).parent(posGroup);
  logoScaleSlider = createSlider(0.1, 3.0, 1.0, 0.01).parent(posGroup);

  // 4. السلايدرز والأشكال
  let shapeGroup = createDiv().parent(ctrl).addClass('control-group');
  createSpan("📐 Geometry & Pattern").parent(shapeGroup);
  shapeSelect = createSelect().parent(shapeGroup);
  shapeSelect.option('Rectangle'); shapeSelect.option('Solid Square'); shapeSelect.option('Circle'); shapeSelect.option('Triangle'); shapeSelect.option('Line');

  angleSlider = createLabeledSlider(ctrl, "Rotation", -PI, PI, 0, 0.01);
  scaleSlider = createLabeledSlider(ctrl, "Element Scale", 0.5, 5, 1, 0.1);
  densitySlider = createLabeledSlider(ctrl, "Density (N)", 10, 100, 40, 1);
  powerSlider = createLabeledSlider(ctrl, "Mouse Influence (P)", 0, 1, 0.5, 0.01);
  strokeOutSlider = createLabeledSlider(ctrl, "Stroke Out", 0, 10, 2, 0.1);
  strokeInSlider = createLabeledSlider(ctrl, "Stroke In", 0, 10, 0, 0.1);

  // 5. الألوان والميكروفون
  let toolGroup = createDiv().parent(ctrl).addClass('control-group');
  createSpan("🎨 Colors & Audio").parent(toolGroup);
  bgPicker = createColorPicker('#f1c40f').parent(toolGroup).style('width','100%');
  fgPicker = createColorPicker('#2c3e50').parent(toolGroup).style('width','100%').style('margin-top','5px');
  createButton('🎤 Enable Mic Sync').parent(toolGroup).mousePressed(enableMic);

  // 6. الحفظ والعشوائية
  createButton('🎲 Randomize').parent(ctrl).style('background','#9b59b6').mousePressed(randomizeUI);
  createButton('💾 Save SVG').parent(ctrl).style('background','#27ae60').mousePressed(() => save("pro_export.svg"));
}

function updateCanvasSize() {
  resizeCanvas(int(inputW.value()), int(inputH.value()));
}

function enableMic() {
  userStartAudio();
  mic = new p5.AudioIn();
  mic.start();
  isAudioEnabled = true;
}

function handleFile(file) {
  if (file.type === 'image') {
    logoMask = loadImage(file.data);
  }
}

async function askAI(prompt) {
  if (!prompt || isAIThinking) return;
  isAIThinking = true;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: 'Return JSON: {"a":-1to1,"so":0to10,"si":0to10,"d":10to100,"p":0to1}' }, { role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    const res = JSON.parse(data.choices[0].message.content);
    angleSlider.value(res.a * PI); strokeOutSlider.value(res.so); strokeInSlider.value(res.si);
    densitySlider.value(res.d); powerSlider.value(res.p);
  } catch (e) { console.error(e); }
  finally { isAIThinking = false; }
}

function draw() {
  background(bgPicker.color());
  if (!logoMask) return;
  
  logoMask.loadPixels();
  let vol = isAudioEnabled ? mic.getLevel() * 600 : 0;
  let actualPower = (mouseX < 0) ? 0 : powerSlider.value();
  
  cols = densitySlider.value();
  rows = int(cols * (height / width));

  // حساب أبعاد اللوجو بدون تمطيط
  let logoRatio = logoMask.width / logoMask.height;
  let canvasRatio = width / height;
  let drawW, drawH;
  if (logoRatio > canvasRatio) {
    drawW = width * logoScaleSlider.value();
    drawH = drawW / logoRatio;
  } else {
    drawH = height * logoScaleSlider.value();
    drawW = drawH * logoRatio;
  }
  
  let startX = (width - drawW) / 2 + posXSlider.value();
  let startY = (height - drawH) / 2 + posYSlider.value();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let cx = map(x, 0, cols - 1, 0, width);
      let cy = map(y, 0, rows - 1, 0, height);

      let imgX = int(map(cx, startX, startX + drawW, 0, logoMask.width));
      let imgY = int(map(cy, startY, startY + drawH, 0, logoMask.height));

      let alpha = 0;
      if (imgX >= 0 && imgX < logoMask.width && imgY >= 0 && imgY < logoMask.height) {
        let idx = (imgX + imgY * logoMask.width) * 4;
        alpha = logoMask.pixels[idx + 3];
      }

      let t = alpha / 255;
      let finalA = lerp(lerp(-maxAngle, maxAngle, t) + angleSlider.value(), atan2(mouseY - cy, mouseX - cx), actualPower); 

      push();
      translate(cx, cy);
      rotate(finalA);
      stroke(fgPicker.color());
      
      let w = (lerp(minLW, maxLW, t) + (alpha > 0 ? vol : 0)) * scaleSlider.value();
      let h = (lerp(minLH, maxLH, t) + (alpha > 0 ? vol : 0)) * scaleSlider.value();

      if (alpha > 0) {
        fill(fgPicker.color());
        strokeInSlider.value() > 0 ? strokeWeight(strokeInSlider.value()) : noStroke();
      } else {
        noFill();
        strokeWeight(strokeOutSlider.value());
      }

      let s = shapeSelect.value();
      if(s === 'Circle') ellipse(0, 0, w, w);
      else if(s === 'Solid Square') rect(0, 0, h, h);
      else if(s === 'Triangle') triangle(-w/2, h/2, 0, -h/2, w/2, h/2);
      else if(s === 'Line') line(0, -h/2, 0, h/2);
      else rect(0, 0, w, h);
      pop();
    }
  }
}

function randomizeUI() {
  angleSlider.value(random(-PI, PI));
  powerSlider.value(random(0, 1));
  bgPicker.value(color(random(255), random(255), random(255)).toString('#rrggbb'));
  fgPicker.value(color(random(255), random(255), random(255)).toString('#rrggbb'));
}

function createLabeledSlider(parent, label, min, max, val, step) {
  let group = createDiv().parent(parent).addClass('control-group');
  createSpan(label).parent(group);
  return createSlider(min, max, val, step).parent(group);
}