function createCube() {
  const positions = new Float32Array([
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,   // front
     1, -1, -1,  -1, -1, -1,  -1,  1, -1,   1,  1, -1,   // back
    -1,  1,  1,   1,  1,  1,   1,  1, -1,  -1,  1, -1,   // top
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,   // bottom
     1, -1,  1,   1, -1, -1,   1,  1, -1,   1,  1,  1,   // right
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1    // left
  ]);
  const faceNormals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
  const normals = new Float32Array(faceNormals.flatMap(n => [...n, ...n, ...n, ...n]));

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,   // front
     4,  5,  6,   4,  6,  7,   // back
     8,  9, 10,   8, 10, 11,   // top
    12, 13, 14,  12, 14, 15,   // bottom
    16, 17, 18,  16, 18, 19,   // right
    20, 21, 22,  20, 22, 23    // left
  ]);
  return { positions, normals, indices };
}

function createCylinder(segments) {
  const pos = [], nrm = [], idx = [];

  // Side
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    pos.push(x, -1, z, x, 1, z);
    nrm.push(x, 0, z, x, 0, z);
  }
  for (let i = 0; i < segments; i++) {
    const b = i * 2;
    idx.push(b, b + 1, b + 3, b, b + 3, b + 2);
  }

  // Caps
  for (const y of [-1, 1]) {
    const center = pos.length / 3;
    pos.push(0, y, 0);
    nrm.push(0, y, 0);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pos.push(Math.cos(a), y, Math.sin(a));
      nrm.push(0, y, 0);
    }
    for (let i = 1; i <= segments; i++) {
      if (y > 0) idx.push(center, center + i + 1, center + i);
      else idx.push(center, center + i, center + i + 1);
    }
  }

  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint16Array(idx) };
}

function createCone(segments) {
  const pos = [], nrm = [], idx = [];

  // Side
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    pos.push(x, -1, z, 0, 1, 0);
    nrm.push(x, 0, z, x, 0, z);
  }
  for (let i = 0; i < segments; i++) {
    const b = i * 2;
    idx.push(b, b + 3, b + 2);
  }

  // Cap
  let center = pos.length/3;
  pos.push(0, -1, 0);
  nrm.push(0, -1, 0);
  
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pos.push(Math.cos(a), -1, Math.sin(a));
    nrm.push(0, -1, 0);
  }
  for (let i = 1; i <= segments; i++) {
    idx.push(center, center + i, center + i + 1);
  }  

  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint16Array(idx) };
}

function createSphere(segments) {
  const pos = [], nrm = [], idx = [];

  for (let j = 0; j <= segments; j++) {
    const b = j/segments*Math.PI;
    const y = Math.cos(b);
    const r = Math.sin(b);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2, x = r * Math.cos(a), z = r * Math.sin(a);
      pos.push(x, y, z);
      nrm.push(x, y, z);
    }
  }

  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const first = j*(segments+1) +i;
      const second = first + segments + 1;
      idx.push(first, first+1, second);
      idx.push(second, first+1, second+1);
    }
  }
  
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint16Array(idx) };
}

function flatShading(mesh)
{
  const pos = [], nrm = [], idx = [];
  const posn = mesh.positions, ind = mesh.indices;

  for(let i=0; i<ind.length; i+=3)
  {
    const a = ind[i]*3, b = ind[i+1]*3, c = ind[i+2]*3;
    const ax = posn[a], ay = posn[a+1], az = posn[a+2];
    const bx = posn[b], by = posn[b+1], bz = posn[b+2];
    const cx = posn[c], cy = posn[c+1], cz = posn[c+2];

    const edge1x = bx-ax, edge1y = by-ay, edge1z = bz-az;
    const edge2x = cx-ax, edge2y = cy-ay, edge2z = cz-az;

    let nx = edge1y*edge2z - edge1z*edge2y;
    let ny = edge1z*edge2x - edge1x*edge2z;
    let nz = edge1x*edge2y - edge1y*edge2x;

    const len = Math.hypot(nx, ny, nz);
    if(len < 1e-8) continue;
    nx /= len, ny /= len, nz /= len;

    const base = pos.length/3;
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    idx.push(base, base+1, base+2);
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint16Array(idx) };
}