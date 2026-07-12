<template>
  <div class="files is-family-code">
    <div class="files-body">
      <div class="files-dirs">
        <button
          v-for="shortcut in SIDEBAR"
          :key="shortcut.label"
          :class="{ 'is-active': shortcut.dir === vfsDir, 'is-drop': dropTarget === shortcut.dir }"
          @click="switchDir(shortcut.dir)"
          @dragover.prevent="dropTarget = shortcut.dir"
          @dragleave="dropTarget = null"
          @drop.prevent="dropInto(shortcut.dir)"
        >
          {{ shortcut.label }}/
        </button>
      </div>
      <!-- the list is a keyboard listbox: ↑↓ move, Enter opens, Del bins,
           Backspace/← goes up; files drag onto folders to move -->
      <div
        ref="listRef"
        class="files-list"
        tabindex="0"
        role="listbox"
        aria-label="Files"
        @keydown="onListKeydown"
      >
        <nav v-if="vfsDir" class="files-crumbs" aria-label="Current folder path">
          <button
            class="files-crumb"
            :class="{ 'is-drop': dropTarget === '' }"
            @click="vfsDir = ''"
            @dragover.prevent="dropTarget = ''"
            @dragleave="dropTarget = null"
            @drop.prevent="dropInto('')"
          >~</button>
          <template v-for="crumb in crumbs" :key="crumb.path">
            <span class="files-crumb-sep" aria-hidden="true">/</span>
            <button
              class="files-crumb"
              :class="{ 'is-drop': dropTarget === crumb.path }"
              :disabled="crumb.path === vfsDir"
              @click="vfsDir = crumb.path"
              @dragover.prevent="dropTarget = crumb.path"
              @dragleave="dropTarget = null"
              @drop.prevent="dropInto(crumb.path)"
            >
              {{ crumb.name }}
            </button>
          </template>
        </nav>
        <div
          v-for="(entry, i) in vfsEntries"
          :key="entry.name"
          class="files-row"
          :class="{ 'is-selected': i === selected, 'is-drop': entry.dir && dropTarget === entryPath(entry.name) }"
        >
          <template v-if="renaming === entry.name">
            <input
              ref="renameRef"
              v-model="renameValue"
              class="files-rename is-family-code"
              :aria-label="`New name for ${entry.name}`"
              spellcheck="false"
              @keydown.enter.prevent="applyRename(entry)"
              @keydown.esc.prevent="renaming = null"
              @blur="renaming = null"
            >
          </template>
          <template v-else>
            <button
              class="files-file"
              :class="{ 'is-dir': entry.dir }"
              :aria-selected="i === selected"
              draggable="true"
              @click="selected = i; openVfsEntry(entry)"
              @contextmenu.prevent.stop="openFileMenu(entry, $event)"
              @dragstart="onDragStart(entry, $event)"
              @dragend="dragPath = null; dropTarget = null"
              @dragover="entry.dir ? (dropTarget = entryPath(entry.name)) : null"
              @dragleave="entry.dir ? (dropTarget = null) : null"
              @drop.prevent="entry.dir ? dropInto(entryPath(entry.name)) : null"
            >
              <span v-if="entry.dir" class="files-glyph" aria-hidden="true">▸</span>
              <AppIcon v-else name="file" :size="13" />
              <span class="files-name">{{ entry.name }}{{ entry.dir ? '/' : '' }}</span>
              <span v-if="entry.edited" class="files-badge" title="Edited by you — rm restores the original">edited</span>
            </button>
            <button
              class="files-delete"
              :aria-label="`Move ${entry.name} to the recycle bin`"
              title="Move to recycle bin"
              @click="deleteVfsEntry(entry)"
            >×</button>
          </template>
        </div>
        <p v-if="actionError" class="files-error">{{ actionError }}</p>
        <p v-if="!vfsDir" class="files-hint">
          the site's pages live here as real folders — and files you create in
          the terminal (touch, echo &gt;, mkdir) show up alongside them
        </p>
      </div>
    </div>
    <!-- right-click context menu on a file: open / rename / bin -->
    <div
      v-if="fileMenu"
      class="files-menu is-family-code"
      :style="{ left: `${fileMenu.x}px`, top: `${fileMenu.y}px` }"
    >
      <button @click="menuOpenEntry">open</button>
      <button v-if="fileMenu && !fileMenu.entry.dir" @click="menuEdit">edit in vim</button>
      <button @click="menuRename">rename</button>
      <button @click="menuProperties">properties</button>
      <button class="is-danger" @click="menuDelete">move to bin</button>
    </div>

    <!-- file properties dialog -->
    <div v-if="properties" class="files-props is-family-code">
      <div class="files-props-head">
        <span>{{ properties.name }}</span>
        <button aria-label="Close" @click="properties = null">×</button>
      </div>
      <table class="files-props-table">
        <tbody>
          <tr><th>kind</th><td>{{ properties.kind }}</td></tr>
          <tr><th>size</th><td>{{ properties.size }}</td></tr>
          <tr v-if="properties.lines !== null"><th>lines</th><td>{{ properties.lines }}</td></tr>
          <tr><th>path</th><td>~/{{ properties.path }}</td></tr>
          <tr><th>perms</th><td>{{ properties.perms }}</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="preview" class="files-preview">
      <div class="files-preview-head">
        <span>$ cat {{ preview.name }}</span>
        <button aria-label="Close preview" @click="preview = null">×</button>
      </div>
      <pre>{{ preview.content || '(empty file)' }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
// lvOS file explorer over THE filesystem — the same one the terminal's
// cd/ls/cat/vim walk, which holds the site's pages as seeded folders next to
// whatever the visitor created. Blog posts open in the blog reader, the
// resume opens the PDF viewer, everything else previews inline. All the model
// (navigate, rename, delete, drag-move, right-click) lives in useFileExplorer.

const emit = defineEmits<{
  window: [id: string]
  post: [path: string]
  /** Open a file in the vim window */
  edit: [path: string]
}>()

const SIDEBAR = FILE_SIDEBAR
const {
  vfsDir, preview, actionError, entryPath,
  deleteVfsEntry,
  fileMenu, renaming, renameValue, renameRef, openFileMenu,
  menuOpenEntry, menuEdit, menuDelete, properties, menuProperties, menuRename, applyRename,
  switchDir, crumbs, vfsEntries, openVfsEntry,
  listRef, selected, onListKeydown,
  dragPath, dropTarget, onDragStart, dropInto
} = useFileExplorer({
  window: (id) => emit('window', id),
  post: (path) => emit('post', path),
  edit: (path) => emit('edit', path)
})
</script>

<style scoped lang="scss">
.files {
  position: relative; // anchors the right-click file menu
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 11rem;
  font-size: 0.78rem;
}

.files-body {
  display: flex;
  gap: 0.75rem;
  flex: 1;
}

.files-dirs {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-right: 0.75rem;
  border-right: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);

  button {
    padding: 0.3rem 0.6rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    white-space: nowrap;

    &.is-active,
    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
      color: var(--bulma-primary);
    }

    // a folder lit up as a drop target while dragging a file over it
    &.is-drop {
      background-color: hsla(var(--lv-primary-hsl), 0.28);
      color: var(--bulma-primary);
    }
  }
}

.files-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  outline: none;

  // keyboard focus on the listbox itself gets a faint frame
  &:focus-visible {
    box-shadow: inset 0 0 0 1px hsla(var(--lv-primary-hsl), 0.4);
    border-radius: var(--bulma-radius-small);
  }
}

.files-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: var(--bulma-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: hsla(var(--lv-primary-hsl), 0.15);
  }

  &.is-dir {
    color: var(--bulma-primary);
  }

  // long user-created names ellipsize instead of widening the window body
  .files-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .files-badge {
    margin-left: 0.3rem;
    padding: 0 0.3rem;
    border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
    border-radius: 0.5rem;
    color: var(--bulma-primary);
    font-size: 0.6rem;
    line-height: 1.4;
  }
}

.files-row {
  display: flex;
  align-items: center;
  border-radius: var(--bulma-radius-small);

  // the keyboard-selected row, and a folder-row lit up as a drop target
  &.is-selected {
    background-color: hsla(var(--lv-primary-hsl), 0.12);
  }

  &.is-drop .files-file {
    background-color: hsla(var(--lv-primary-hsl), 0.28);
    color: var(--bulma-primary);
  }

  .files-file {
    flex: 1;
    min-width: 0;
  }

  // the delete affordance stays faint until hover/focus — visible enough for
  // touch (which has no hover), calm enough for the list
  .files-delete {
    padding: 0 0.4rem;
    border: none;
    background: none;
    color: hsl(var(--lv-scheme-hs), 55%);
    font: inherit;
    font-size: 0.9rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.35;
  }

  &:hover .files-delete,
  .files-delete:focus-visible {
    opacity: 1;
  }

  .files-delete:hover {
    color: var(--bulma-danger);
  }
}

.files-glyph {
  width: 13px;
  text-align: center;
}

.files-crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.15rem;
  padding: 0.1rem 0.3rem 0.35rem;
  border-bottom: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.15);
  margin-bottom: 0.25rem;

  .files-crumb {
    padding: 0.1rem 0.3rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: var(--bulma-primary);
    font: inherit;
    font-size: 0.72rem;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }

    &:disabled {
      color: hsl(var(--lv-scheme-hs), 80%);
      cursor: default;
    }
  }

  .files-crumb-sep {
    color: hsl(var(--lv-scheme-hs), 45%);
    font-size: 0.72rem;
  }
}

.files-hint {
  margin-top: 0.4rem;
  padding: 0.3rem 0.5rem;
  color: hsl(var(--lv-scheme-hs), 55%);
  font-size: 0.7rem;
}

.files-rename {
  flex: 1;
  margin: 0.15rem 0;
  padding: 0.2rem 0.5rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.5);
  border-radius: var(--bulma-radius-small);
  background: none;
  color: hsl(var(--lv-scheme-hs), 92%);
  font-size: inherit;
  outline: none;
  caret-color: var(--bulma-primary);
}

.files-error {
  padding: 0.2rem 0.5rem;
  color: var(--bulma-danger);
  font-size: 0.7rem;
}

.files-props {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 31;
  min-width: 14rem;
  padding: 0.6rem 0.8rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 10px 26px hsla(var(--lv-scheme-hs), 2%, 0.5);
  font-size: 0.72rem;

  .files-props-head {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    color: var(--bulma-primary);

    button {
      border: none;
      background: none;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
  }

  .files-props-table {
    th {
      padding: 0.1rem 0.8rem 0.1rem 0;
      color: hsl(var(--lv-scheme-hs), 55%);
      font-weight: normal;
      text-align: left;
      vertical-align: top;
    }

    td {
      padding: 0.1rem 0;
      color: hsl(var(--lv-scheme-hs), 88%);
      word-break: break-all;
    }
  }
}

.files-menu {
  position: absolute;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 8rem;
  padding: 0.25rem;
  border: 1px solid hsla(var(--lv-primary-hsl), 0.4);
  border-radius: var(--bulma-radius);
  background-color: hsla(var(--lv-scheme-hs), 8%, 0.98);
  box-shadow: 0 10px 26px hsla(var(--lv-scheme-hs), 2%, 0.5);

  button {
    padding: 0.35rem 0.6rem;
    border: none;
    border-radius: var(--bulma-radius-small);
    background: none;
    color: hsl(var(--lv-scheme-hs), 88%);
    font: inherit;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: hsla(var(--lv-primary-hsl), 0.15);
    }

    &.is-danger:hover {
      color: var(--bulma-danger);
    }
  }
}

.files-preview {
  border-top: 1px solid hsla(var(--lv-scheme-hs), 50%, 0.2);
  padding-top: 0.4rem;

  .files-preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--bulma-primary);
    margin-bottom: 0.25rem;

    button {
      border: none;
      background: none;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
  }

  pre {
    max-height: 8rem;
    overflow: auto;
    padding: 0.4rem 0.5rem;
    background-color: hsla(var(--lv-scheme-hs), 50%, 0.08);
    border-radius: var(--bulma-radius-small);
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
}
</style>
