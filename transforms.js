function multiply(a, b) {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + i] * b[j * 4 + k];
      r[j * 4 + i] = sum;
    }
  return r;
}

function translate(x, y, z) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

function scale(x, y, z) {
  return new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
}

function rotateX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotateY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function rotateZ(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14]
  ];
}

const ROTATE = { x: rotateX, y: rotateY, z: rotateZ };


let light1_cb = document.getElementById("light1");
let light2_cb = document.getElementById("light2");

let light1_color = document.getElementById("light1rgb");
let light2_color = document.getElementById("light2rgb");

let shine = document.getElementById("sphere_sc");
let sphere_color_ka = document.getElementById("sphere_ka");
let sphere_color_kd = document.getElementById("sphere_kd");
let sphere_color_ks = document.getElementById("sphere_ks");

let sphere_swing = document.getElementById("sphere");
let conel_swing = document.getElementById("conel");
let cubel_swing = document.getElementById("cubel");
let cylinderl_swing = document.getElementById("cylinderl");
let coner_swing = document.getElementById("coner");
let cuber_swing = document.getElementById("cuber");
let cylinderr_swing = document.getElementById("cylinderr");

let translate_x = document.getElementById("sphere_x");
let translate_y = document.getElementById("sphere_y");
let translate_z = document.getElementById("sphere_z");

function hexTowebgl(hex)
{
  const r = parseInt(hex.slice(1, 3), 16)/255;
  const g = parseInt(hex.slice(3, 5), 16)/255;
  const b = parseInt(hex.slice(5, 7), 16)/255;
  return [r, g, b];
}

light1_cb.addEventListener("change", ()=>{
  if(light1_cb.checked)
  {
    lightColor[0] = [0, 0, 0];
  }
  else
  {
    lightColor[0] = hexTowebgl(light1_color.value);
  }
  light1_color.disabled = light1_cb.checked;
});

light2_cb.addEventListener("change", ()=>{
  if(light1_cb.checked)
  {
    lightColor[1] = [0, 0, 0];
  }
  else
  {
    lightColor[1] = hexTowebgl(light2_color.value);
  }
  light2_color.disabled = light2_cb.checked;
});

light1_color.addEventListener("input", ()=>{
    lightColor[0] = hexTowebgl(light1_color.value);
});

light2_color.addEventListener("input", ()=>{
    lightColor[1] = hexTowebgl(light2_color.value);
});

sphere_color_ka.addEventListener("input", ()=>{
  sphere_shape.material.Ka = hexTowebgl(sphere_color_ka.value);
});

sphere_color_kd.addEventListener("input", ()=>{
  sphere_shape.material.Kd = hexTowebgl(sphere_color_kd.value);
});

sphere_color_ks.addEventListener("input", ()=>{
  sphere_shape.material.Ks = hexTowebgl(sphere_color_ks.value);
});

function updateMaterial()
{
  sphere_shape.material.Shininess = shine.value;
}

sphere_swing.addEventListener("input", ()=>{
  sphere_angle = sphere_swing.value * Math.PI/180;
});

conel_swing.addEventListener("input", ()=>{
  conel_angle = conel_swing.value * Math.PI/180;
});

cubel_swing.addEventListener("input", ()=>{
  cubel_angle = cubel_swing.value * Math.PI/180;
});

cylinderl_swing.addEventListener("input", ()=>{
  cylinderl_angle = cylinderl_swing.value * Math.PI/180;
});

coner_swing.addEventListener("input", ()=>{
  coner_angle = coner_swing.value * Math.PI/180;
});

cuber_swing.addEventListener("input", ()=>{
  cuber_angle = cuber_swing.value * Math.PI/180;
});

cylinderr_swing.addEventListener("input", ()=>{
  cylinderr_angle = cylinderr_swing.value * Math.PI/180;
});

translate_x.addEventListener("input", ()=>{
  tx = translate_x.value;
});

translate_y.addEventListener("input", ()=>{
  ty = translate_y.value;
});

translate_z.addEventListener("input", ()=>{
  tz = translate_z.value;
});

function ResetChanges()
{
  lightWorld[0] = [3, 4, 5];
  lightWorld[1] = [-4, 1, 3];
  lightColor[0] = [0.9, 0.9, 0.9];
  lightColor[1] = [0.2, 0.4, 1.0];
  light1_cb.checked = false;
  light2_cb.checked = false;
  light1_color.value = "#E6E6E6";
  light2_color.value = "#3366FF";
  sphere_shape.material.Shininess = 200;
  shine.value = 200;
  sphere_shape.material.Ka = [0.3, 0.3, 0.3];
  sphere_color_ka.value = "#4D4D4D";
  sphere_shape.material.Kd = [0.5, 0.5, 0.5];
  sphere_color_kd.value = "#808080";
  sphere_shape.material.Ks = [0.4, 0.4, 0.4];
  sphere_color_ks.value = "#666666";

  sphere_angle = 0.05;
  sphere_swing.value = 3;
  conel_angle = 0.25;
  conel_swing.value = 14;
  cubel_angle = 0.15;
  cubel_swing.value = 8;
  cylinderl_angle = 0.1;
  cylinderl_swing.value = 5;
  coner_angle = 0.25;
  coner_swing.value = 14;
  cuber_angle = 0.15;
  cuber_swing.value = 8;
  cylinderr_angle = 0.1;
  cylinderr_swing.value = 5;

  tx = 0;
  translate_x.value = 0;
  ty = 0;
  translate_y.value = 0;
  tz = 0;
  translate_z.value = 0;
}