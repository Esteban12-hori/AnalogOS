/**
 * Navbar "liquid glass": una gota de agua dibujada con un shader WebGL mínimo que se estira hacia
 * la sección elegida, se divide en gotitas en saltos largos y se une con una onda.
 * Adaptado de Nimbus UI · Liquid Navbar "Waterline" (guglielmogiannattasio.it).
 * Sin WebGL cae a una gota CSS. Con prefers-reduced-motion la gota salta sin física.
 * Estilos en styles.css (prefijo .lq-).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

export type LiquidFx = 'spin' | 'drop' | 'glow' | 'wave' | 'pop'

export interface LiquidNavItem {
  id: string
  label: string
  icon: ReactNode
  fx?: LiquidFx
}

interface LiquidNavProps {
  items: readonly LiquidNavItem[]
  active: number
  onSelect: (index: number) => void
  label?: string
}

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const liquidIcons = {
  ranking: svg(<><path d="M5 19V11" /><path d="M12 19V5" /><path d="M19 19v-5" /></>),
  globe: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17" /></>),
  signal: svg(<path d="M3 15.5c2.2 0 2.6-6 5-6s2.6 8 5 8 2.8-11 5.2-11c1.3 0 2 1.4 2.8 3" />),
  compare: svg(<><rect x="3.5" y="5" width="7" height="14" rx="2" /><rect x="13.5" y="5" width="7" height="14" rx="2" /></>),
  planner: svg(<><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 4.5h6M8.5 11l1.6 1.6L13 9.8M8.5 17h7" /></>),
  method: svg(<><path d="M9.5 3.5h5" /><path d="M10.5 3.5v5.2L5 18.2A1.6 1.6 0 0 0 6.4 20.5h11.2a1.6 1.6 0 0 0 1.4-2.3l-5.5-9.5V3.5" /><path d="M7.5 14.5h9" /></>),
}

const PAD = 14

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'
// Shader original de Waterline; la paleta del tinte se desplaza hacia el azul #0297DE.
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uAmb;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*.18;
 vec3 c=vec3(0.,.1,.2)*sh;float a=sh;
 float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
 c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 vec3 tint=vec3(.30,.70,.95);
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.30+.14*body);vec3 dc=mix(tint,vec3(1.),body*.45);
 float la=rim*.26;vec3 lc=vec3(.01,.59,.87);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`

type Body = { x: number; v: number }
type Sat = { x: number; y: number; vx: number; vy: number; r: number; k: number }
type Rip = { x: number; y: number; age: number; amp: number }
type Uniform = 'uRes' | 'uDpr' | 'uTime' | 'uPill' | 'uBlob' | 'uSy' | 'uRip' | 'uMouse' | 'uAmb'
type GLContext = { gl: WebGLRenderingContext; u: Record<Uniform, WebGLUniformLocation | null> }

function makeState() {
  return {
    a: { x: 0, v: 0 } as Body,
    b: { x: 0, v: 0 } as Body,
    sy: { s: 1, v: 0 },
    lead: 0 as 0 | 1,
    lagFrom: 0,
    sats: [] as Sat[],
    rips: [] as Rip[],
    t: { x: 0, cy: 0, q: 0, r: 21 },
    q: 0,
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    visible: true,
    reduce: false,
    raf: 0,
    last: 0,
    time: 0,
    glc: null as GLContext | null,
  }
}

function initGL(canvas: HTMLCanvasElement): GLContext | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return null
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
  }
  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  const program = gl.createProgram()
  if (!vs || !fs || !program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const names: Uniform[] = ['uRes', 'uDpr', 'uTime', 'uPill', 'uBlob', 'uSy', 'uRip', 'uMouse', 'uAmb']
  const u = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)])) as Record<Uniform, WebGLUniformLocation | null>
  return { gl, u }
}

export function LiquidNav({ items, active, onSelect, label = 'Secciones' }: LiquidNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const st = useRef(makeState())
  const [gl, setGl] = useState<'on' | 'off'>('on')
  const [fx, setFx] = useState({ i: -1, n: 0 })

  const draw = useCallback(() => {
    const s = st.current
    const T = s.t
    const sep = Math.abs(s.a.x - s.b.x)
    const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1)
    if (s.glc) {
      const { gl: g, u } = s.glc
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight)
      g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2)
      g.uniform1f(u.uDpr, dpr)
      g.uniform1f(u.uTime, s.time)
      g.uniform4f(u.uPill, PAD, PAD, s.w, s.h)
      const blobs = new Float32Array(24)
      const sy = new Float32Array(6).fill(1)
      const head = s.lead === 0 ? s.a : s.b
      const tail = s.lead === 0 ? s.b : s.a
      blobs.set([head.x, T.cy, s.q * (1 - 0.25 * thin), T.r * (1 - 0.12 * thin), tail.x, T.cy, s.q * (1 - 0.8 * thin), T.r * (1 - 0.5 * thin)], 0)
      sy[0] = sy[1] = s.sy.s
      s.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r], 8 + i * 4))
      g.uniform4fv(u.uBlob, blobs)
      g.uniform1fv(u.uSy, sy)
      const rips = new Float32Array(24)
      s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4))
      g.uniform4fv(u.uRip, rips)
      g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s)
      g.uniform1f(u.uAmb, s.reduce ? 0 : 1)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.drawArrays(g.TRIANGLES, 0, 3)
    } else if (dropRef.current) {
      const r = T.r * (1 - 0.3 * thin)
      const left = Math.min(s.a.x, s.b.x) - s.q - r - PAD
      dropRef.current.style.width = `${sep + 2 * (s.q + r)}px`
      dropRef.current.style.transform = `translateX(${left}px) scaleY(${s.sy.s})`
    }
  }, [])

  const step = useCallback((dt: number, now: number) => {
    const s = st.current
    const T = s.t
    s.time += dt
    s.q += (T.q - s.q) * Math.min(1, dt * 12)
    const bodies = [s.a, s.b]
    let still = true
    if (s.reduce) {
      s.a.x = s.b.x = T.x
      s.a.v = s.b.v = 0
      s.sy.s = 1
      s.sats = []
    } else {
      bodies.forEach((B, i) => {
        const lead = i === s.lead
        const k = lead ? 210 : 72
        const c = lead ? 25 : 13
        const f = !lead && now < s.lagFrom ? 0.08 : 1
        B.v += (k * (T.x - B.x) - c * B.v) * dt * f
        B.x += B.v * dt
        const lo = PAD + 6 + s.q + T.r - 3
        const hi = PAD + s.w - 6 - s.q - T.r + 3
        if (B.x < lo || B.x > hi) {
          s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016
          B.x = Math.max(lo, Math.min(hi, B.x))
          B.v *= -0.25
        }
        if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false
      })
      const L = bodies[s.lead]
      const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1)
      s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt
      s.sy.s += s.sy.v * dt
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false
      const sep = Math.abs(s.a.x - s.b.x)
      const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1))
      if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
        s.split = true
        const lo = bodies[1 - s.lead]
        const hi = bodies[s.lead]
        ;[0.3, 0.5, 0.72].forEach((t, j) => {
          s.sats.push({
            x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
            y: T.cy + (Math.random() - 0.5) * 10,
            vx: (lo.v + hi.v) * 0.45,
            vy: (Math.random() - 0.5) * 60,
            r: 5 + Math.random() * 3 - j * 0.5,
            k: 70 + Math.random() * 90,
          })
        })
      }
      s.sats = s.sats.filter((d) => {
        d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt
        d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.x = Math.max(PAD + 8 + d.r, Math.min(PAD + s.w - 8 - d.r, d.x))
        d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y))
        if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 26
        return d.r > 0.6
      })
      if (s.sats.length) still = false
    }
    if (s.moving && still) {
      s.moving = false
      if (!s.reduce) s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.2 : 0.7 })
    }
    s.rips.forEach((p) => { p.age += dt })
    s.rips = s.rips.filter((p) => p.age < 2.4)
    s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7)
  }, [])

  // Sin interacción, el agua ambiental se dibuja a ~15 fps: el resto del escenario (globo,
  // mapa, vidrio) conserva la fluidez. Cualquier interacción vuelve a 60 fps al instante.
  const idleTimer = useRef(0)
  const loop = useCallback(() => {
    const s = st.current
    if (idleTimer.current) {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = 0
      s.raf = 0
    }
    if (s.raf) return
    s.last = performance.now()
    let wasIdle = false
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, wasIdle ? 1 / 12 : 1 / 30)
      s.last = now
      step(dt, now)
      draw()
      const busy = s.moving || s.rips.length > 0 || s.sats.length > 0 || s.mouse.s > 0.01
      if (!s.visible || (s.reduce && !busy)) {
        s.raf = 0
        return
      }
      wasIdle = !busy
      if (busy) {
        s.raf = requestAnimationFrame(tick)
      } else {
        s.raf = -1
        idleTimer.current = window.setTimeout(() => {
          idleTimer.current = 0
          s.raf = requestAnimationFrame(tick)
        }, 66)
      }
    }
    s.raf = requestAnimationFrame(tick)
  }, [draw, step])

  const measure = useCallback(() => {
    const nav = navRef.current
    const el = itemRefs.current[active]
    if (!nav || !el) return
    const s = st.current
    s.w = nav.offsetWidth
    s.h = nav.offsetHeight
    const T = s.t
    T.r = el.offsetHeight / 2
    T.q = Math.max(0, el.offsetWidth / 2 - T.r)
    T.cy = PAD + el.offsetTop + el.offsetHeight / 2
    const nx = PAD + el.offsetLeft + el.offsetWidth / 2
    if (!s.ready) {
      s.a.x = s.b.x = nx
      s.q = T.q
      s.ready = true
    } else if (Math.abs(nx - T.x) > 0.5) {
      s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1
      s.lagFrom = performance.now() + 70
      s.moving = true
      s.split = false
    }
    T.x = nx
    const cv = canvasRef.current
    if (cv) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = s.w + PAD * 2
      const Hh = s.h + PAD * 2
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(Hh * dpr)
        cv.style.width = `${W}px`
        cv.style.height = `${Hh}px`
      }
    }
    loop()
  }, [active, loop])

  useEffect(() => {
    const s = st.current
    s.reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    const cv = canvasRef.current
    s.glc = cv ? initGL(cv) : null
    if (!s.glc) setGl('off')
    const lost = (event: Event) => {
      event.preventDefault()
      s.glc = null
      setGl('off')
    }
    cv?.addEventListener('webglcontextlost', lost)
    const io = new IntersectionObserver(([entry]) => {
      s.visible = entry?.isIntersecting ?? true
      if (s.visible) loop()
    })
    if (navRef.current) io.observe(navRef.current)
    const onVisibility = () => {
      s.visible = document.visibilityState === 'visible'
      if (s.visible) loop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cv?.removeEventListener('webglcontextlost', lost)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(s.raf)
      window.clearTimeout(idleTimer.current)
      idleTimer.current = 0
      s.raf = 0
    }
  }, [loop])

  useLayoutEffect(() => { measure() }, [measure, items.length])
  const measureRef = useRef(measure)
  measureRef.current = measure
  useEffect(() => {
    let lastW = -1
    const ro = new ResizeObserver(() => {
      const w = navRef.current?.offsetWidth ?? 0
      if (w !== lastW) {
        lastW = w
        st.current.ready = false
        measureRef.current()
      }
    })
    if (navRef.current) ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [])

  const local = (clientX: number, clientY: number) => {
    const rect = navRef.current?.getBoundingClientRect()
    return rect ? { x: clientX - rect.left + PAD, y: clientY - rect.top + PAD } : { x: 0, y: 0 }
  }
  const ripple = (x: number, y: number, amp: number) => {
    const s = st.current
    if (s.reduce) return
    s.rips.push({ x, y, age: 0, amp })
    loop()
  }

  const select = (index: number) => {
    setFx((current) => ({ i: index, n: current.n + 1 }))
    if (items[index]?.fx === 'drop') {
      const el = itemRefs.current[index]
      if (el) setTimeout(() => ripple(PAD + el.offsetLeft + 22, st.current.t.cy, 1.4), 430)
    }
    onSelect(index)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = (active + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    select(next)
    itemRefs.current[next]?.focus()
  }

  const onMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const p = local(event.clientX, event.clientY)
    const s = st.current
    s.mouse.x = p.x
    s.mouse.y = p.y
    s.mouse.on = true
    loop()
  }

  return (
    <nav
      ref={navRef}
      className="lq-nav"
      data-gl={gl}
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerMove={onMove}
      onPointerLeave={() => { st.current.mouse.on = false; loop() }}
      onPointerDown={(event) => { const p = local(event.clientX, event.clientY); ripple(p.x, p.y, 0.8) }}
    >
      <span className="lq-glass" aria-hidden="true" />
      <canvas className="lq-water" ref={canvasRef} aria-hidden="true" />
      <span className="lq-drop" ref={dropRef} aria-hidden="true" />
      {items.map((item, index) => {
        const kind = item.fx ?? 'pop'
        const playing = fx.i === index
        return (
          <button
            key={item.id}
            ref={(el) => { itemRefs.current[index] = el }}
            type="button"
            className="lq-item"
            aria-current={index === active ? 'location' : undefined}
            onClick={() => select(index)}
          >
            <span className="lq-ico" key={playing ? fx.n : 0} data-fx={playing ? kind : undefined}>{item.icon}</span>
            <span className="lq-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
