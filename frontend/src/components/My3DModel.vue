<template>
  <primitive :object="model" />
</template>

<script setup>
import { useLoader } from '@tresjs/cientos';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

// まず.mtlファイル（材質）を読み込みます
const materials = await useLoader(MTLLoader, '/models/back-v3-big.mtl');

// OBJLoaderのインスタンスを作成し、読み込んだ材質をセットします
const objLoader = new OBJLoader();
objLoader.setMaterials(materials);

// 材質設定済みのローダーで.objファイル（形状）を読み込みます
const model = await useLoader(objLoader, '/models/back-v3-big.obj');
</script>
