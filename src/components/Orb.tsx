"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A soft brass-coloured blob that breathes while idle and swells with her voice.
 * `level` is read every frame (0..1) so React never re-renders for audio.
 */
export default function Orb({ level, state }: { level: () => number; state: "idle" | "listening" | "thinking" | "speaking" }) {
  const host = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      el.dataset.fallback = "1"; // no WebGL: the CSS circle behind it stays visible
      return;
    }
    const size = () => Math.min(el.clientWidth, 320);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size(), size());
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10);
    camera.position.z = 3.4;

    const uniforms = {
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uHue: { value: new THREE.Color("#5fb6b2") },
      uDeep: { value: new THREE.Color("#0a5e61") },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime; uniform float uLevel; varying float vNoise; varying vec3 vNormal;
        // cheap 3D value noise, good enough for a wobble
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        float n(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          float k = n(normal*1.6 + uTime*0.35) ;
          vNoise = k; vNormal = normal;
          vec3 p = position + normal * (k*0.12 + uLevel*0.28*k);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }`,
      fragmentShader: `
        uniform vec3 uHue; uniform vec3 uDeep; uniform float uLevel; varying float vNoise; varying vec3 vNormal;
        void main(){
          float light = dot(normalize(vNormal), normalize(vec3(-0.4,0.6,0.8)))*0.5+0.5;
          vec3 c = mix(uDeep, uHue, light*0.85 + vNoise*0.25);
          c += vec3(0.89,0.61,0.11) * uLevel * 0.35;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 48), mat);
    scene.add(mesh);

    let raf = 0;
    let smooth = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const s = stateRef.current;
      const target = s === "speaking" || s === "listening" ? Math.min(1, level() * 2.2) : s === "thinking" ? 0.25 + 0.15 * Math.sin(t * 4) : 0.05;
      smooth += (target - smooth) * 0.18;
      uniforms.uTime.value = t * (s === "thinking" ? 2.2 : 1);
      uniforms.uLevel.value = smooth;
      mesh.rotation.y = t * 0.15;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();
    const onResize = () => renderer.setSize(size(), size());
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mat.dispose();
      mesh.geometry.dispose();
      renderer.domElement.remove();
    };
  }, [level]);

  return (
    <div
      ref={host}
      aria-hidden
      style={{ width: "min(320px, 70vw)", aspectRatio: "1", margin: "0 auto", display: "grid", placeItems: "center" }}
    />
  );
}
