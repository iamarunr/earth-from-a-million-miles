// A sphere textured directly from one day's EPIC photographs.
//
// Each photo shows one hemisphere. For every point on the globe the shader
// runs the photo projection in reverse for each photo, and blends the ones
// that saw that point most directly. Nothing is pre-stitched.

import { diskRadius, type Frame } from './epic'

const EARTH_RADIUS_KM = 6378.137
const MAX_FRAMES = 24
/** Fraction of the canvas the globe's diameter fills. */
export const GLOBE_FILL = 0.92

const rad = (d: number) => (d * Math.PI) / 180
export type Vec3 = [number, number, number]

/** Unit vectors for a viewpoint: towards the viewer, east, and north. */
export function basis(lat: number, lon: number): { c: Vec3; e: Vec3; n: Vec3 } {
  const p = rad(lat)
  const l = rad(lon)
  return {
    c: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
    e: [-Math.sin(l), Math.cos(l), 0],
    n: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)],
  }
}

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_p;
void main() {
  v_p = a_pos / ${GLOBE_FILL.toFixed(2)};
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray u_tex;
uniform int u_count;
uniform vec3 u_c[${MAX_FRAMES}];
uniform vec3 u_e[${MAX_FRAMES}];
uniform vec3 u_n[${MAX_FRAMES}];
uniform vec2 u_k[${MAX_FRAMES}];
uniform vec3 u_vc, u_ve, u_vn;
uniform float u_grid;
uniform float u_px;
uniform float u_zoom;
in vec2 v_p;
out vec4 o;

void main() {
  // The canvas is a round lens. Zooming magnifies the globe inside it.
  float lensR = length(v_p);
  float lens = 1.0 - smoothstep(1.0 - u_px * 2.0, 1.0, lensR);
  vec2 p = v_p / u_zoom;
  float r2 = dot(p, p);
  float alpha = lens * (1.0 - smoothstep(1.0 - u_px * 2.0 / u_zoom, 1.0, sqrt(r2)));
  if (alpha <= 0.0) { o = vec4(0.0); return; }
  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 P = normalize(z * u_vc + p.x * u_ve + p.y * u_vn);

  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  float best = 0.0;
  for (int i = 0; i < ${MAX_FRAMES}; i++) {
    if (i >= u_count) break;
    float facing = dot(P, u_c[i]);
    if (facing > 0.1) {
      // Strongly favour the photo that saw this point most head-on.
      float w = pow(facing - 0.1, 12.0);
      float s = u_k[i].y / (u_k[i].x - facing);
      vec2 uv = vec2(0.5 + s * dot(P, u_e[i]), 0.5 - s * dot(P, u_n[i]));
      acc += w * textureLod(u_tex, vec3(uv, float(i)), 0.0).rgb;
      wsum += w;
      best = max(best, facing);
    }
  }
  // Where no photo saw the surface (polar night), show darkness.
  vec3 night = vec3(0.02, 0.02, 0.022);
  vec3 col = wsum > 0.0 ? mix(night, acc / wsum, smoothstep(0.1, 0.28, best)) : night;

  if (u_grid > 0.0) {
    float lat = degrees(asin(clamp(P.z, -1.0, 1.0)));
    float lon = degrees(atan(P.y, P.x));
    float dLon = abs(fract(lon / 30.0 + 0.5) - 0.5) * 30.0 * cos(radians(lat));
    float dLat = abs(fract(lat / 30.0 + 0.5) - 0.5) * 30.0;
    // Widths are in degrees, so divide by the zoom to keep hairlines hairlines.
    float line = 1.0 - smoothstep(0.12 / u_zoom, 0.42 / u_zoom, min(dLon, dLat));
    float equator = 1.0 - smoothstep(0.2 / u_zoom, 0.55 / u_zoom, abs(lat));
    col = mix(col, vec3(1.0), max(line * 0.3, equator * 0.6) * u_grid);
  }

  // A little shading toward the edge so it reads as a sphere.
  col *= mix(0.7, 1.0, smoothstep(0.0, 0.5, z));
  // When magnified, darken the rim of the lens slightly.
  col *= 1.0 - 0.3 * clamp(u_zoom - 1.0, 0.0, 1.0) * smoothstep(0.82, 1.0, lensR);
  o = vec4(col * alpha, alpha);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader error')
  return sh
}

export interface Globe {
  /** Load the day's photos. Resolves when every photo is on the globe. */
  setFrames(frames: Frame[], srcOf: (f: Frame) => string, size: number, onProgress: (done: number) => void): Promise<void>
  draw(lat: number, lon: number, grid: boolean, zoom: number): void
  dispose(): void
}

export function createGlobe(canvas: HTMLCanvasElement): Globe | null {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false })
  if (!gl) return null

  const prog = gl.createProgram()!
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link error')
  gl.useProgram(prog)

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const u = (name: string) => gl.getUniformLocation(prog, name)
  let tex: WebGLTexture | null = null
  let count = 0
  let generation = 0

  return {
    async setFrames(frames, srcOf, size, onProgress) {
      const mine = ++generation
      count = 0
      const use = frames.slice(0, MAX_FRAMES)

      if (tex) gl.deleteTexture(tex)
      tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex)
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, size, size, use.length)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      const c = new Float32Array(MAX_FRAMES * 3)
      const e = new Float32Array(MAX_FRAMES * 3)
      const n = new Float32Array(MAX_FRAMES * 3)
      const k = new Float32Array(MAX_FRAMES * 2)
      use.forEach((f, i) => {
        const b = basis(f.lat0, f.lon0)
        c.set(b.c, i * 3)
        e.set(b.e, i * 3)
        n.set(b.n, i * 3)
        const d = f.distanceKm / EARTH_RADIUS_KM
        k.set([d, diskRadius(f) * Math.sqrt(d * d - 1)], i * 2)
      })
      gl.uniform3fv(u('u_c'), c)
      gl.uniform3fv(u('u_e'), e)
      gl.uniform3fv(u('u_n'), n)
      gl.uniform2fv(u('u_k'), k)

      const scratch = document.createElement('canvas')
      scratch.width = scratch.height = size
      const ctx = scratch.getContext('2d')!
      let done = 0
      await Promise.all(
        use.map(async (f, i) => {
          // Fetch and decode off the main thread. Unlike Image.decode(), this
          // also completes while the tab is in the background.
          const res = await fetch(srcOf(f))
          if (!res.ok) throw new Error(`Photo request failed (${res.status})`)
          const img = await createImageBitmap(await res.blob())
          if (mine !== generation) return img.close()
          ctx.drawImage(img, 0, 0, size, size)
          img.close()
          gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex)
          gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1, gl.RGBA, gl.UNSIGNED_BYTE, scratch)
          onProgress(++done)
        }),
      )
      if (mine === generation) count = use.length
    },

    draw(lat, lon, grid, zoom) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      if (!count) return
      const v = basis(lat, lon)
      gl.uniform3fv(u('u_vc'), v.c)
      gl.uniform3fv(u('u_ve'), v.e)
      gl.uniform3fv(u('u_vn'), v.n)
      gl.uniform1i(u('u_count'), count)
      gl.uniform1f(u('u_grid'), grid ? 1 : 0)
      gl.uniform1f(u('u_zoom'), zoom)
      gl.uniform1f(u('u_px'), 2 / (canvas.width * GLOBE_FILL))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },

    dispose() {
      generation++
      if (tex) gl.deleteTexture(tex)
      tex = null
      count = 0
    },
  }
}
