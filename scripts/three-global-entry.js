/**
 * 打包入口：把 three@0.165 + GLTFLoader + RGBELoader 挂到 window.THREE
 * 生成：npm run build:three → vendor/three.r165.js
 */
import * as ThreeNS from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const THREE = { ...ThreeNS, GLTFLoader, RGBELoader };
window.THREE = THREE;
