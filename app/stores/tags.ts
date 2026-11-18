import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Team } from '~/domain/score/types'
import type { TagServiceKind, TagStatus } from '~/services/tags/TagService'

/** Reactive mirror of the TagService state, for the UI. */
export const useTagsStore = defineStore('tags', () => {
  const kind = ref<TagServiceKind>('keyboard')
  const status = ref<Record<Team, TagStatus>>({ blue: 'unpaired', orange: 'unpaired' })

  function setStatuses(next: Readonly<Record<Team, TagStatus>>): void {
    status.value = { ...next }
  }

  return { kind, status, setStatuses }
})
