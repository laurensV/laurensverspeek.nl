<template>
  <!-- bare layout for lvOS: no navbar, footer or background — the desktop is the
       whole page, so nothing here can scroll behind it -->
  <div class="lvos-shell">
    <slot />
    <!-- the site-wide effects render here too, so matrix/party/destroy/boss
         work ON the desktop instead of flipping flags into the void -->
    <LazyMatrixRain v-if="matrixActive" />
    <LazyDomDestroyer v-if="destructActive" />
    <LazyFireworksShow v-if="fireworksActive" />
    <SlTrain />
    <PartyMode />
    <BossScreen />
  </div>
</template>

<script setup lang="ts">
const { matrixActive, destructActive, fireworksActive } = useSiteEffects()
</script>
