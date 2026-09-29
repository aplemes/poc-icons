<script setup lang="ts">
import { AZ_ICON_SIZES, AzIcon } from '@azulejo/icons'
import type { AzIconName, AzIconSize } from '@azulejo/icons'
import { computed, ref } from 'vue'

const size = ref<AzIconSize>(24)
const color = ref('#1d1d1b')
const query = ref('')
const showGallery = ref(false)
const fromApi = ref('search')

// The list of names is a separate entry, downloaded only when the gallery opens.
const names = ref<readonly AzIconName[]>([])
async function openGallery() {
  names.value = (await import('@azulejo/icons/names')).azIconNames
  showGallery.value = true
}

const filtered = computed(() => names.value.filter((name) => name.includes(query.value.trim())))
</script>

<template>
  <main :style="{ color }">
    <h1>
      <AzIcon icon="home" size="32" />
      Azulejo Icons
    </h1>

    <section class="controls">
      <label>
        Size
        <select v-model.number="size">
          <option v-for="option in AZ_ICON_SIZES" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </label>
      <label>Color <input v-model="color" type="color" /></label>
    </section>

    <section>
      <h2>Static names</h2>
      <p class="row">
        <AzIcon icon="search" :size="size" />
        <AzIcon icon="arrow-next" :size="size" />
        <AzIcon icon="swap-left" :size="size" />
        <AzIcon icon="notification" :size="size" label="Notifications" />
        <AzIcon icon="cart" :size="size" class="accent" />
      </p>
    </section>

    <section>
      <h2>Name received at runtime</h2>
      <p class="row">
        <input v-model="fromApi" placeholder="icon name" />
        <AzIcon :icon="fromApi as AzIconName" :size="size" />
        <small>An unknown name renders an empty placeholder.</small>
      </p>
    </section>

    <section>
      <h2>Gallery</h2>
      <button v-if="!showGallery" type="button" @click="openGallery">Load every icon</button>
      <template v-else>
        <input v-model="query" placeholder="Filter" />
        <p>{{ filtered.length }} icons</p>
        <ul class="gallery">
          <li v-for="name in filtered" :key="name">
            <AzIcon :icon="name" :size="size" />
            <code>{{ name }}</code>
          </li>
        </ul>
      </template>
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #fff;
}
main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
h1,
.row,
.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.accent {
  color: #78be20;
}
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  padding: 0;
  list-style: none;
}
.gallery li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 4px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}
.gallery code {
  font-size: 12px;
  color: #555;
}
</style>
