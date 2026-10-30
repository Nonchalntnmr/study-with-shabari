"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box3,
  Color,
  DirectionalLight,
  type Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PMREMGenerator,
  type PerspectiveCamera,
  Raycaster,
  SphereGeometry,
  Spherical,
  Vector2,
  Vector3,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { type ExplorerConfig, type ExplorerRegion, pickMap, regionById } from "@/lib/explore/types";
import type { ExplorerStore } from "./explorer-store";

const FOV = 35;
const FLIGHT_MS = 700;
const AUTOROTATE_S = 40;
const GHOST = new Color("#C9D2DF");
const noRaycast: Object3D["raycast"] = () => {};

export type SceneProps = {
  config: ExplorerConfig;
  store: ExplorerStore;
  tier: "mobile" | "desktop";
  dprCap: number;
  reducedMotion: boolean;
  onReady: () => void;
  onFail: (why: "load" | "lost") => void;
};

/** Fetch a pre-gzipped .glb.gz and unpack it with DecompressionStream (no WebAssembly decoder: the CSP allows none). */
async function loadModel(url: string, signal: AbortSignal): Promise<Group> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`model ${res.status}`);
  let buf = await res.arrayBuffer();
  const head = new Uint8Array(buf, 0, 2);
  // A server that already sent it with Content-Encoding: gzip hands over the plain GLB; only unpack real gzip.
  if (head[0] === 0x1f && head[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
  const gltf = await new GLTFLoader().parseAsync(buf, "");
  return gltf.scene;
}

type Built = { root: Group; meshes: Mesh[]; markers: Mesh[]; bounds: Map<string, Box3> };

function build(scene: Group, config: ExplorerConfig): Built {
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.computeVertexNormals();
      o.geometry.computeBoundingSphere();
      o.material = new MeshStandardMaterial({ color: config.neutral, roughness: 0.58, metalness: 0 });
      o.userData.atom = o.name;
      meshes.push(o);
    }
  });
  scene.updateMatrixWorld(true);
  const markers: Mesh[] = [];
  const geo = new SphereGeometry(0.0022, 20, 14);
  for (const r of config.regions) {
    for (const p of r.markers ?? []) {
      const m = new Mesh(geo, new MeshStandardMaterial({ color: r.color, roughness: 0.4, metalness: 0, emissive: new Color(r.color), emissiveIntensity: 0.35 }));
      m.position.set(p[0], p[1], p[2]);
      m.userData.region = r.id;
      m.renderOrder = 3;
      scene.add(m);
      markers.push(m);
    }
  }
  const bounds = new Map<string, Box3>();
  for (const m of meshes) bounds.set(m.name, new Box3().setFromObject(m));
  return { root: scene, meshes, markers, bounds };
}

function disposeBuilt(b: Built) {
  const seen = new Set<unknown>();
  b.root.traverse((o) => {
    if (o instanceof Mesh) {
      if (!seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
      (o.material as MeshStandardMaterial).dispose();
    }
  });
}

/** Neutral studio reflections, generated locally (no HDR download); disposed with its render target. */
function Studio() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [get]);
  return null;
}

/** Fewer pixels when frames run long; back up when they're quick. */
function AdaptiveDpr({ cap }: { cap: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const dpr = useRef(Math.min(cap, typeof window === "undefined" ? 1 : window.devicePixelRatio));
  const slow = useRef(0);
  const fast = useRef(0);
  useFrame((_, dt) => {
    if (dt > 0.1) return; // a pause in the on-demand loop, not a slow frame
    const ms = dt * 1000;
    if (ms > 24) {
      slow.current++;
      fast.current = 0;
    } else if (ms < 12) {
      fast.current++;
      slow.current = 0;
    }
    if (slow.current > 30 && dpr.current > 1) {
      dpr.current = Math.max(1, dpr.current - 0.25);
      setDpr(dpr.current);
      slow.current = 0;
    } else if (fast.current > 120 && dpr.current < Math.min(cap, window.devicePixelRatio)) {
      dpr.current = Math.min(cap, dpr.current + 0.25);
      setDpr(dpr.current);
      fast.current = 0;
    }
  });
  return null;
}

type Flight = { t0: number; fromT: Vector3; toT: Vector3; fromD: Vector3; toD: Vector3; fromL: number; toL: number };

function Explorer3D({ config, store, tier, reducedMotion, onReady, onFail }: Omit<SceneProps, "dprCap">) {
  const { camera, gl, invalidate, size } = useThree((s) => ({ camera: s.camera as PerspectiveCamera, gl: s.gl, invalidate: s.invalidate, size: s.size }));
  const [built, setBuilt] = useState<Built | null>(null);
  const picks = useMemo(() => pickMap(config), [config]);
  const controls = useRef<OrbitControls | null>(null);
  const flight = useRef<Flight | null>(null);
  const interacted = useRef(false);
  const started = useRef(0);
  const frames = useRef(0);
  const key = useRef<DirectionalLight>(null);
  const readyCalled = useRef(false);

  // Load once per tier; dispose everything on unmount.
  useEffect(() => {
    const ac = new AbortController();
    let made: Built | null = null;
    loadModel(config.assets[tier].gz, ac.signal)
      .then((scene) => {
        if (ac.signal.aborted) return;
        made = build(scene, config);
        setBuilt(made);
      })
      .catch(() => {
        if (!ac.signal.aborted) onFail("load");
      });
    return () => {
      ac.abort();
      if (made) disposeBuilt(made);
    };
  }, [config, tier, onFail]);

  // Context loss: hand back to the still, which offers to try again.
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onFail("lost");
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onFail]);

  // Orbit controls: no pan (the target stays on the model), clamped distance, no inertia.
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enablePan = false;
    c.enableDamping = false;
    c.minDistance = 0.12;
    c.maxDistance = 0.85;
    c.rotateSpeed = 0.8;
    c.zoomSpeed = 0.9;
    c.autoRotateSpeed = 1.2;
    const stop = () => {
      interacted.current = true;
      flight.current = null;
      c.autoRotate = false;
    };
    const change = () => invalidate();
    c.addEventListener("start", stop);
    c.addEventListener("change", change);
    controls.current = c;
    return () => {
      c.removeEventListener("start", stop);
      c.removeEventListener("change", change);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);

  const regionBounds = (r: ExplorerRegion, near?: Vector3) => {
    const box = new Box3();
    if (!built) return box;
    const sides = new Set(r.atoms.map((a) => a.split(".")[0]));
    // For a region on both sides, frame and label the side facing the camera.
    const side = near && sides.has("L") && sides.has("R") ? (near.x >= 0 ? "L" : "R") : null;
    for (const a of r.atoms) if (!side || a.startsWith(side + ".")) {
      const b = built.bounds.get(a);
      if (b) box.union(b);
    }
    for (const p of r.markers ?? []) if (!side || (side === "L") === p[0] >= 0) box.expandByPoint(new Vector3(p[0], p[1], p[2]));
    if (r.markers?.length) box.expandByScalar(0.004);
    return box;
  };

  const modelRadius = useMemo(() => {
    if (!built) return 0.12;
    const b = new Box3();
    for (const box of built.bounds.values()) b.union(box);
    return b.getSize(new Vector3()).length() / 2;
  }, [built]);

  const fit = (radius: number) => {
    const aspect = Math.max(0.6, Math.min(1, size.width / Math.max(1, size.height)));
    return (radius / Math.sin(((FOV / 2) * Math.PI) / 180)) * (1 / aspect);
  };

  const flyTo = (target: Vector3, dir: Vector3, dist: number, instant: boolean) => {
    const c = controls.current;
    if (!c) return;
    const d = dir.clone().normalize();
    if (instant) {
      flight.current = null;
      c.target.copy(target);
      camera.position.copy(target).addScaledVector(d, dist);
      c.update();
      invalidate();
      return;
    }
    const fromD = camera.position.clone().sub(c.target);
    flight.current = { t0: performance.now(), fromT: c.target.clone(), toT: target.clone(), fromD: fromD.clone().normalize(), toD: d, fromL: fromD.length(), toL: dist };
    invalidate();
  };

  const home = (instant: boolean) => {
    flyTo(new Vector3(0, 0, 0), new Vector3(...config.defaultView), fit(modelRadius) * 0.92, instant);
  };

  // Paint every mesh for the current layer, selection and hover; fly to a new selection.
  useEffect(() => {
    if (!built) return;
    let lastSelected: string | null | undefined;
    let lastResets = store.get().resets;
    const paint = () => {
      const st = store.get();
      const sel = regionById(config, st.selected);
      const hov = regionById(config, st.hovered);
      const layer = config.layers.find((l) => l.id === st.layer) ?? config.layers[0];
      const pm = picks.get(layer.id)!;
      const selAtoms = new Set(sel?.atoms ?? []);
      const hovAtoms = new Set(hov && hov.id !== sel?.id ? hov.atoms : []);
      for (const m of built.meshes) {
        const atom = m.name;
        const cls = config.atomClass(atom);
        let mode = layer.modes[cls] ?? "solid";
        if (sel?.xray && config.xrayClasses.includes(cls) && !selAtoms.has(atom)) mode = "ghost";
        if (selAtoms.has(atom) || hovAtoms.has(atom)) mode = "solid";
        const mat = m.material as MeshStandardMaterial;
        m.visible = mode !== "hidden";
        const ghost = mode === "ghost";
        mat.transparent = ghost;
        mat.opacity = ghost ? 0.1 : 1;
        mat.depthWrite = !ghost;
        m.renderOrder = ghost ? 2 : 0;
        const own = regionById(config, pm.get(atom));
        let color = own?.color ?? config.neutral;
        let glow = 0;
        if (sel) {
          color = selAtoms.has(atom) ? sel.color : config.neutral;
          glow = selAtoms.has(atom) ? 0.22 : 0;
        }
        if (hovAtoms.has(atom)) {
          color = hov!.color;
          glow = 0.32;
        }
        if (ghost) color = GHOST.getStyle();
        mat.color.set(color);
        mat.emissive.set(color);
        mat.emissiveIntensity = glow;
        mat.needsUpdate = true;
        const pickable = mode === "solid" && (pm.has(atom) || picks.get(config.defaultLayer)!.has(atom));
        m.raycast = pickable ? Mesh.prototype.raycast : noRaycast;
      }
      for (const mk of built.markers) {
        const r = regionById(config, mk.userData.region as string)!;
        mk.visible = layer.id === r.layer || sel?.id === r.id || hov?.id === r.id;
        const mat = mk.material as MeshStandardMaterial;
        const dim = sel && sel.id !== r.id;
        mat.color.set(dim ? config.neutral : r.color);
        mat.emissiveIntensity = dim ? 0 : hov?.id === r.id ? 0.6 : 0.35;
        mk.raycast = mk.visible ? Mesh.prototype.raycast : noRaycast;
      }
      if (controls.current) controls.current.autoRotate = !reducedMotion && !interacted.current && !sel && (performance.now() - started.current) / 1000 < AUTOROTATE_S;
      if (st.selected !== lastSelected || st.resets !== lastResets) {
        const first = lastSelected === undefined;
        lastSelected = st.selected;
        lastResets = st.resets;
        if (sel) {
          const dir = new Vector3(...sel.view).normalize();
          const box = regionBounds(sel, dir);
          const sphere = box.getBoundingSphere(new (box.min.constructor as typeof Vector3)() as never);
          void sphere;
          const centre = box.getCenter(new Vector3());
          const radius = Math.max(0.03, box.getSize(new Vector3()).length() / 2);
          flyTo(centre, dir, Math.min(0.5, Math.max(0.17, fit(radius) * 1.1)), reducedMotion);
        } else if (!first) {
          home(reducedMotion);
        }
      }
      invalidate();
    };
    started.current = performance.now();
    home(true);
    paint();
    const unsub = store.subscribe(paint);
    return () => {
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paint reads the latest camera helpers; re-run only for a new model or config
  }, [built, config, picks, store, reducedMotion]);

  // Keyboard and button commands from the DOM.
  useEffect(() => {
    const off = store.onCommand((cmd) => {
        const c = controls.current;
        if (!c) return;
        interacted.current = true;
        c.autoRotate = false;
        flight.current = null;
        if (cmd.type === "reset") {
          home(reducedMotion);
          return;
        }
        const offset = camera.position.clone().sub(c.target);
        const s = new Spherical().setFromVector3(offset);
        if (cmd.type === "rotate") {
          s.theta += cmd.azimuth;
          s.phi = Math.min(Math.PI - 0.15, Math.max(0.15, s.phi + cmd.polar));
        } else {
          s.radius = Math.min(c.maxDistance, Math.max(c.minDistance, s.radius * cmd.factor));
        }
        camera.position.copy(c.target).add(new Vector3().setFromSpherical(s));
        c.update();
        invalidate();
      });
    return () => {
      off();
    };
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- home() reads the latest fit; the subscription itself only depends on these
    [store, camera, invalidate, reducedMotion, modelRadius],
  );

  // Test hook (automation only): readiness, camera state, a screen point that picks a given region.
  useEffect(() => {
    if (!built || typeof navigator === "undefined" || !navigator.webdriver) return;
    const ray = new Raycaster();
    const w = window as unknown as Record<string, unknown>;
    w.__explorer = {
      tier,
      frames: () => frames.current,
      moving: () => Boolean(flight.current) || Boolean(controls.current?.autoRotate),
      camera: () => camera.position.toArray(),
      memory: () => ({ ...gl.info.memory }),
      pointFor(id: string) {
        const rect = gl.domElement.getBoundingClientRect();
        const hits: [number, number][] = [];
        for (let y = 0.05; y < 1; y += 0.03)
          for (let x = 0.05; x < 1; x += 0.03) {
            ray.setFromCamera(new Vector2(x * 2 - 1, -(y * 2 - 1)), camera);
            const hit = ray.intersectObjects([...built.meshes, ...built.markers], false).find((h) => h.object.visible);
            if (hit && resolve(hit.object) === id) hits.push([rect.left + x * rect.width, rect.top + y * rect.height]);
          }
        if (!hits.length) return null;
        const cx = hits.reduce((s, h) => s + h[0], 0) / hits.length;
        const cy = hits.reduce((s, h) => s + h[1], 0) / hits.length;
        return hits.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
      },
    };
    return () => {
      delete w.__explorer;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve is stable for a given picks map
  }, [built, camera, gl, tier, picks]);

  function resolve(o: Object3D): string | undefined {
    if (o.userData.region) return o.userData.region as string;
    const layer = store.get().layer;
    return picks.get(layer)?.get(o.name) ?? picks.get(config.defaultLayer)?.get(o.name);
  }

  const v = useMemo(() => new Vector3(), []);
  useFrame((_, dt) => {
    frames.current++;
    const c = controls.current;
    if (!c) return;
    const f = flight.current;
    if (f) {
      const t = Math.min(1, (performance.now() - f.t0) / FLIGHT_MS);
      const e = 1 - Math.pow(1 - t, 3);
      c.target.lerpVectors(f.fromT, f.toT, e);
      const dir = f.fromD.clone().lerp(f.toD, e).normalize();
      if (dir.lengthSq() < 1e-6) dir.copy(f.toD);
      camera.position.copy(c.target).addScaledVector(dir, f.fromL + (f.toL - f.fromL) * e);
      c.update();
      if (t >= 1) flight.current = null;
      invalidate();
    } else if (c.autoRotate) {
      if ((performance.now() - started.current) / 1000 > AUTOROTATE_S) c.autoRotate = false;
      c.update(dt);
      invalidate();
    }
    // The key light follows the camera, a little above it, so the side in view is always lit.
    if (key.current) {
      key.current.position.copy(camera.position).add(v.set(0, 0.25, 0));
      key.current.target.position.copy(c.target);
      key.current.target.updateMatrixWorld();
    }
    // DOM labels for the selection and the hover.
    const st = store.get();
    for (const which of ["selected", "hovered"] as const) {
      const el = store.labels[which];
      if (!el) continue;
      const r = regionById(config, st[which]);
      if (!r || (which === "hovered" && st.hovered === st.selected)) {
        el.style.opacity = "0";
        continue;
      }
      const box = regionBounds(r, camera.position.clone().sub(c.target));
      if (box.isEmpty()) {
        el.style.opacity = "0";
        continue;
      }
      const p = box.getCenter(v).project(camera);
      const x = ((p.x + 1) / 2) * size.width;
      const y = ((1 - p.y) / 2) * size.height;
      const inside = p.z < 1 && x > 8 && x < size.width - 8 && y > 8 && y < size.height - 8;
      el.style.opacity = inside ? "1" : "0";
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -130%)`;
    }
    if (built && !readyCalled.current) {
      readyCalled.current = true;
      requestAnimationFrame(onReady);
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // a drag, not a click
    const id = resolve(e.object);
    if (!id) return;
    const r = regionById(config, id)!;
    store.set({ selected: id, layer: r.layer, hovered: null });
  };
  const hover = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== "mouse") return;
    e.stopPropagation();
    const id = resolve(e.object) ?? null;
    if (store.get().hovered !== id) store.set({ hovered: id });
    gl.domElement.style.cursor = id ? "pointer" : "";
  };
  const leave = () => {
    gl.domElement.style.cursor = "";
    if (store.get().hovered) store.set({ hovered: null });
  };

  return (
    <>
      <hemisphereLight args={["#ffffff", "#d9dfea", 1.1]} />
      <directionalLight ref={key} intensity={2.1} />
      <directionalLight position={[-0.4, -0.2, -0.5]} intensity={0.45} color="#E8EEFA" />
      {built && <primitive object={built.root} onClick={pick} onPointerMove={hover} onPointerOut={leave} />}
    </>
  );
}

export default function ExplorerScene(props: SceneProps) {
  const { config, store, dprCap } = props;
  type Ctrl = { invalidate: () => void; setFrameloop: (f: "always" | "demand" | "never") => void; internal: { frames: number }; get?: () => Ctrl };
  const r3f = useRef<Ctrl | null>(null);
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = !document.hidden;
    const s0 = r3f.current?.get ? r3f.current.get() : r3f.current;
    if (s0) {
      s0.setFrameloop(document.hidden ? "never" : "demand");
      if (!document.hidden) s0.invalidate();
    }
    const onVis = () => {
      activeRef.current = !document.hidden;
      const s = r3f.current?.get ? r3f.current.get() : r3f.current;
      if (s) {
        s.internal.frames = 0;
        s.setFrameloop(document.hidden ? "never" : "demand");
        if (!document.hidden) s.invalidate();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      activeRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      const s = r3f.current?.get ? r3f.current.get() : r3f.current;
      if (s) {
        s.internal.frames = 0;
        s.setFrameloop("never");
      }
    };
  }, []);
  return (
    <Canvas
      frameloop="demand"
      resize={{ scroll: false }}
      dpr={[1, dprCap]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 0.01, far: 5, position: [0.3, 0.1, 0.2] }}
      onCreated={(state) => {
        state.gl.setClearColor(0x000000, 0);
        const origRender = state.gl.render.bind(state.gl);
        state.gl.render = (scene, camera) => {
          if (!activeRef.current || document.hidden) return;
          origRender(scene, camera);
        };
        r3f.current = state;
      }}
      onPointerMissed={(e) => {
        if (e.type === "click" && store.get().selected) store.set({ selected: null });
      }}
      aria-hidden
      data-testid={`${config.id}-canvas`}
    >
      <Studio />
      <AdaptiveDpr cap={dprCap} />
      <Explorer3D {...props} />
    </Canvas>
  );
}
