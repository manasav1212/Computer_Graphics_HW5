const VERTEX_SHADER = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelView;
uniform mat4 uProjection;

out vec3 vPosition;
out vec3 vNormal;

void main() {
  vec4 p = uModelView * vec4(aPosition, 1.0);
  vPosition = p.xyz;
  vNormal = mat3(uModelView) * aNormal;
  gl_Position = uProjection * p;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec3 vPosition;
in vec3 vNormal;

const int NUM_LIGHT_SRC = 3;

uniform vec3 uLightPos[NUM_LIGHT_SRC];   // eye space
uniform vec3 uLightCol[NUM_LIGHT_SRC];
uniform vec3 uColor;
uniform vec3 uKa;
uniform vec3 uKd;
uniform vec3 uKs;
uniform float uShininess;

out vec4 fragColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vPosition);           // camera sits at the origin

  vec3 color = uKa;

  for(int i=0; i<NUM_LIGHT_SRC; i++)
  {
    vec3 L = normalize(uLightPos[i] - vPosition);
    vec3 R = reflect(-L, N);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(V, R), 0.0), uShininess);
    color += uLightCol[i]*(uKd * diff + uKs * spec);
  }

  

  fragColor = vec4(color, 1.0);
}
`;

// WebGL setup
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

// Fixed attribute slots, so the meshes stay valid when the shaders are recompiled
const ATTRIBUTES = { aPosition: 0, aNormal: 1 };

function createProgram(vsSource, fsSource) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  for (const name in ATTRIBUTES) gl.bindAttribLocation(prog, ATTRIBUTES[name], name);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

// Shader editors
const vertEditor = document.getElementById("vertEditor");
const fragEditor = document.getElementById("fragEditor");
const shaderError = document.getElementById("shaderError");
vertEditor.value = VERTEX_SHADER;
fragEditor.value = FRAGMENT_SHADER;

let program, uModelView, uProjection, uLightPos, uColor, uKa, uKd, uKs, uShininess;

function updateProgram() {
  try {
    const prog = createProgram(vertEditor.value, fragEditor.value);
    gl.deleteProgram(program);
    program = prog;
    gl.useProgram(program);
    uModelView = gl.getUniformLocation(program, "uModelView");
    uProjection = gl.getUniformLocation(program, "uProjection");
    uLightPos = gl.getUniformLocation(program, "uLightPos");
    uLightCol = gl.getUniformLocation(program, "uLightCol");
    uColor = gl.getUniformLocation(program, "uColor");
    uKa = gl.getUniformLocation(program, "uKa");
    uKd = gl.getUniformLocation(program, "uKd");
    uKs = gl.getUniformLocation(program, "uKs");
    uShininess = gl.getUniformLocation(program, "uShininess");
    shaderError.textContent = "";
  } catch (e) {
    shaderError.textContent = e.message.replace(/\0/g, "");  // some drivers end the log with \0
  }
}
updateProgram();
vertEditor.addEventListener("input", updateProgram);
fragEditor.addEventListener("input", updateProgram);

function makeMaterial(mKa, mKd, mKs, mShininess)
{
  return {
    Ka:mKa,
    Kd:mKd,
    Ks:mKs,
    Shininess:mShininess
  };
}

function bindAttribute(name, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.vertexAttribPointer(ATTRIBUTES[name], 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(ATTRIBUTES[name]);
}

function createMesh({ positions, normals, indices }) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  bindAttribute("aPosition", positions);
  bindAttribute("aNormal", normals);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return { vao, count: indices.length };
}

const sphereMesh = createMesh(createSphere(32));
const cubeMesh_l = createMesh(createCube());
const cylinderMesh_l = createMesh(flatShading(createCylinder(32)));
const coneMesh_l = createMesh(flatShading(createCone(15)));
const cubeMesh_r = createMesh(createCube());
const cylinderMesh_r = createMesh(createCylinder(32));
const coneMesh_r = createMesh(createCone(15));

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0, 0, 0, 1);
const projection = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
const lightWorld = [
  [3, 4, 5],
  [-4, 1, 3]
];

const lightColor = [
  [0.9, 0.9, 0.9],
  [0.2, 0.4, 1.0]
];

// nteractive controls
let dragRotX = 0, dragRotY = -0.5;      // mouse drag
let camX = 0, camY = 0, camZ = -7;      // arrow keys, w, s
let sliderAngle = 0;                    // degrees
let spinning = false, spinAngle = 0;    // Start/Stop button

let mouseDown = false, lastX, lastY;
canvas.addEventListener("mousedown", e => { mouseDown = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener("mouseup", () => mouseDown = false);
window.addEventListener("mousemove", e => {
  if (!mouseDown) return;
  dragRotY += (e.clientX - lastX) * 0.01;
  dragRotX += (e.clientY - lastY) * 0.01;
  lastX = e.clientX; lastY = e.clientY;
});

document.addEventListener("keydown", e => {
  if (e.target === vertEditor || e.target === fragEditor) return;  // let the editors use the keys
  const step = 0.2;
  switch (e.key) {
    case "ArrowUp": camY -= step; break;
    case "ArrowDown": camY += step; break;
    case "ArrowLeft": camX += step; break;
    case "ArrowRight": camX -= step; break;
    case "w": camZ += step; break;
    case "s": camZ -= step; break;
    default: return;
  }
  e.preventDefault();  // keep the arrow keys from scrolling the page
});

const axisSelect = document.getElementById("axisSelect");
document.getElementById("slider").addEventListener("input", e => {
  sliderAngle = Number(e.target.value);
  document.getElementById("sliderValue").textContent = sliderAngle;
});
document.getElementById("spinButton").addEventListener("click", () => spinning = !spinning);


function createNode(mesh, material, shape) {
  return { mesh, material, shape, joint: null, children: [] };
}

//Head
const sphereMaterial = makeMaterial([0.3, 0.3, 0.3], [0.5, 0.5, 0.5], [0.4, 0.4, 0.4], 200);
const sphere_shape = createNode(sphereMesh, sphereMaterial,
multiply(translate(0, 1.2, 0), scale(0.7, 0.5, 0.5)));

// Left
const cylinderMaterial_l = makeMaterial([0.05, 0.05, 0.05], [0.45, 0.95, 0.0], [0.0, 0.0, 0.0], 1);
const cylinder_shape_l = createNode(cylinderMesh_l, cylinderMaterial_l,
  multiply(translate(-0.7, -1.8, 0), scale(0.35, 0.6, 0.3)));

const cubeMaterial_l = makeMaterial([0.1, 0.1, 0.1], [0.75, 0.4, 0.75], [0.4, 0.2, 0.4], 10);
const cube_shape_l = createNode(cubeMesh_l, cubeMaterial_l,
  multiply(translate(-0.7, -0.65, 0), scale(0.25, 0.6, 0.3)));

const coneMaterial_l = makeMaterial([0.0, 0.0, 0.0], [0.6, 0.4, 0.0], [0.5, 0.4, 0.3], 50);
const cone_shape_l = createNode(coneMesh_l, coneMaterial_l,
multiply(translate(-0.7, 0.55, 0), scale(0.3, 0.6, 0.3)));

// Right
const cylinderMaterial_r = makeMaterial([0.05, 0.05, 0.05], [0.45, 0.95, 0.0], [0.5, 0.4, 0.3], 1);
const cylinder_shape_r = createNode(cylinderMesh_r, cylinderMaterial_r,
  multiply(translate(0.7, -1.8, 0), scale(0.35, 0.6, 0.3)));

const cubeMaterial_r = makeMaterial([0.25, 0.25, 0.25], [0.75, 0.4, 0.75], [0.4, 0.2, 0.4], 10);
const cube_shape_r = createNode(cubeMesh_r, cubeMaterial_r,
  multiply(translate(0.7, -.65, 0), scale(0.25, 0.6, 0.3)));

const coneMaterial_r = makeMaterial([0.0, 0.0, 0.0], [0.6, 0.4, 0.0], [0.5, 0.4, 0.3], 100);
const cone_shape_r = createNode(coneMesh_r, coneMaterial_r,
multiply(translate(0.7, 0.55, 0), scale(0.3, 0.6, 0.3)));

cone_shape_l.children.push(cube_shape_l);
cube_shape_l.children.push(cylinder_shape_l);

cone_shape_r.children.push(cube_shape_r);
cube_shape_r.children.push(cylinder_shape_r);

sphere_shape.children.push(cone_shape_l);
sphere_shape.children.push(cone_shape_r);

function drawNode(node, frame) {
  gl.uniformMatrix4fv(uModelView, false, multiply(frame, node.shape));
  //gl.uniform3fv(uColor, node.color);
  gl.bindVertexArray(node.mesh.vao);
  gl.uniform3fv(uKa, node.material.Ka);
  gl.uniform3fv(uKd, node.material.Kd);
  gl.uniform3fv(uKs, node.material.Ks);
  gl.uniform1f(uShininess, node.material.Shininess);
  gl.drawElements(gl.TRIANGLES, node.mesh.count, gl.UNSIGNED_SHORT, 0);
}

//Data structure
function drawTree(root, rootFrame) {
  const stack = [[root, rootFrame]];
  while (stack.length > 0) {
    const [node, parentFrame] = stack.pop();
    const frame = multiply(parentFrame, node.joint);
    drawNode(node, frame);
    for (const child of node.children) stack.push([child, frame]);
  }
}

function jointRotation(pivot, R)
{
  return multiply(multiply(translate(pivot[0], pivot[1], pivot[2]), R), translate(-pivot[0], -pivot[1], -pivot[2]));
}

let sphere_angle = 0.05;
let conel_angle = 0.25;
let cubel_angle = 0.15;
let cylinderl_angle = 0.1;
let coner_angle = 0.25;
let cuber_angle = 0.15;
let cylinderr_angle = 0.1;

let tx = 0;
let ty = 0;
let tz = 0;

// Render loop
let lastTime = 0;
function render(time) {
  const t = time / 1000;
  if (spinning) spinAngle += t - lastTime;
  lastTime = t;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Camera moves with the keys; the light stays fixed in the world.
  const view = translate(camX, camY, camZ);
  gl.uniformMatrix4fv(uProjection, false, projection);
  //gl.uniform3fv(uLightPos, transformPoint(view, lightWorld));

  const lightPositions = [];
  for(const lw of lightWorld)
  {
    lightPositions.push(...transformPoint(view, lw));
  }
  gl.uniform3fv(uLightPos, lightPositions);
  gl.uniform3fv(uLightCol, lightColor.flat());


  // Whole-model rotation
  const axisRotation = ROTATE[axisSelect.value](sliderAngle * Math.PI / 180 + spinAngle);
  const rotation = multiply(multiply(rotateY(dragRotY), rotateX(dragRotX)), axisRotation);

  sphere_shape.joint = multiply(translate(tx, ty, tz), multiply(rotation, jointRotation([0, 1.2, 0], rotateZ(sphere_angle * Math.sin(t)))));

  cone_shape_l.joint = jointRotation([-0.7, 1.15, 0], rotateZ(conel_angle * Math.sin(t)));
  cube_shape_l.joint = jointRotation([-0.7, -0.05, 0], rotateZ(cubel_angle * Math.sin(t)));
  cylinder_shape_l.joint = jointRotation([-0.7, -1.25, 0], rotateZ(cylinderl_angle * Math.sin(t)));

  cone_shape_r.joint = jointRotation([0.7, 1.15, 0], rotateZ(coner_angle * Math.sin(t)));
  cube_shape_r.joint = jointRotation([0.7, -0.05, 0], rotateZ(cuber_angle * Math.sin(t)));
  cylinder_shape_r.joint = jointRotation([0.7, -1.25, 0], rotateZ(cylinderr_angle * Math.sin(t)));

  drawTree(sphere_shape, view);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
