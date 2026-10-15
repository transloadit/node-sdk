/** YouTube upload categories shared by authored instructions and execution. */
export const youtubeCategoryIds = {
  'autos & vehicles': '2',
  comedy: '23',
  education: '27',
  entertainment: '24',
  'film & animation': '1',
  gaming: '20',
  'howto & style': '26',
  music: '10',
  'news & politics': '25',
  'people & blogs': '22',
  'pets & animals': '15',
  'science & technology': '28',
  sports: '17',
  'travel & events': '19',
} satisfies Record<string, string>

/** Canonical category spellings; authoring and execution also accept case variants. */
// Object.keys loses literal keys and nonemptiness, both guaranteed by the map above.
export const youtubeCategories = Object.keys(youtubeCategoryIds) as [
  keyof typeof youtubeCategoryIds,
  ...(keyof typeof youtubeCategoryIds)[],
]
