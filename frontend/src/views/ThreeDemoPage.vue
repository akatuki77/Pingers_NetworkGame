<template>
  <TresCanvas window-size>
    <TresPerspectiveCamera :position="[3, 3, 3]" />
    <OrbitControls />
    <Suspense>
      <My3DModel />
    </Suspense>
    <TresGridHelper />
    <TresAmbientLight />
  </TresCanvas>
</template>

<script setup>
import { TresCanvas } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
import { Suspense } from 'vue';
import My3DModel from '../components/My3DModel.vue';
</script>
