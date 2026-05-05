export type DuaCategory = 'peace' | 'forgiveness' | 'healing' | 'provision' | 'repentance'

export interface DuaMeta {
  id: number;
  surah: number;
  ayah: number;
  topic: string;
  categories: DuaCategory[];
}

// Full Dua — metadata + content fetched from the Quran Foundation API
export interface Dua extends DuaMeta {
  arabicText: string;
  transliteration: string;
  translations: {
    en: string;
    ur: string;
    bn: string;
  };
  audioUrl?: string;
}

// Curated list of the 40 Rabbana duas — verse references only.
// All text content (Arabic, transliteration, translations) is fetched
// live from the Quran Foundation Content API at runtime.
export const RABBANA_META: DuaMeta[] = [
  { id: 1,  surah: 2,  ayah: 127, topic: "Acceptance of Deeds",              categories: [] },
  { id: 2,  surah: 2,  ayah: 128, topic: "Submission & Repentance",          categories: ['repentance'] },
  { id: 3,  surah: 2,  ayah: 201, topic: "Goodness in Both Worlds",          categories: ['peace', 'provision'] },
  { id: 4,  surah: 2,  ayah: 250, topic: "Patience & Victory",               categories: ['peace'] },
  { id: 5,  surah: 3,  ayah: 8,   topic: "Steadfastness in Faith",           categories: ['peace'] },
  { id: 6,  surah: 3,  ayah: 9,   topic: "Day of Judgment",                  categories: [] },
  { id: 7,  surah: 3,  ayah: 16,  topic: "Forgiveness",                      categories: ['forgiveness'] },
  { id: 8,  surah: 3,  ayah: 147, topic: "Forgiveness & Victory",            categories: ['forgiveness', 'peace'] },
  { id: 9,  surah: 3,  ayah: 191, topic: "Reflection & Protection",          categories: ['peace'] },
  { id: 10, surah: 3,  ayah: 192, topic: "Fear of Hellfire",                 categories: [] },
  { id: 11, surah: 3,  ayah: 193, topic: "Forgiveness & Righteous Death",    categories: ['forgiveness'] },
  { id: 12, surah: 3,  ayah: 194, topic: "Fulfillment of Promise",           categories: [] },
  { id: 13, surah: 7,  ayah: 23,  topic: "Repentance & Mercy",               categories: ['repentance', 'forgiveness'] },
  { id: 14, surah: 7,  ayah: 89,  topic: "Justice & Truth",                  categories: [] },
  { id: 15, surah: 10, ayah: 85,  topic: "Protection from Oppressors",       categories: ['peace'] },
  { id: 16, surah: 14, ayah: 38,  topic: "Allah's Knowledge",                categories: [] },
  { id: 17, surah: 14, ayah: 40,  topic: "Prayer & Acceptance of Dua",       categories: [] },
  { id: 18, surah: 14, ayah: 41,  topic: "Forgiveness for Parents & Believers", categories: ['forgiveness'] },
  { id: 19, surah: 17, ayah: 80,  topic: "Truthful Entry & Exit",            categories: [] },
  { id: 20, surah: 18, ayah: 10,  topic: "Mercy & Guidance",                 categories: ['peace', 'healing'] },
  { id: 21, surah: 20, ayah: 114, topic: "Increase in Knowledge",            categories: [] },
  { id: 22, surah: 23, ayah: 97,  topic: "Protection from Shaytan",          categories: ['peace'] },
  { id: 23, surah: 23, ayah: 109, topic: "Faith & Mercy",                    categories: ['peace', 'healing'] },
  { id: 24, surah: 25, ayah: 65,  topic: "Protection from Hellfire",         categories: [] },
  { id: 25, surah: 25, ayah: 74,  topic: "Righteous Family",                 categories: ['provision'] },
  { id: 26, surah: 26, ayah: 83,  topic: "Wisdom & Righteousness",           categories: [] },
  { id: 27, surah: 27, ayah: 19,  topic: "Gratitude & Righteousness",        categories: ['provision'] },
  { id: 28, surah: 28, ayah: 16,  topic: "Seeking Forgiveness",              categories: ['forgiveness', 'repentance'] },
  { id: 29, surah: 29, ayah: 30,  topic: "Help Against Corruptors",          categories: [] },
  { id: 30, surah: 40, ayah: 7,   topic: "Mercy & Forgiveness",              categories: ['forgiveness', 'healing'] },
  { id: 31, surah: 40, ayah: 8,   topic: "Entry into Paradise",              categories: [] },
  { id: 32, surah: 40, ayah: 9,   topic: "Protection from Sin",              categories: ['repentance'] },
  { id: 33, surah: 46, ayah: 15,  topic: "Gratitude & Righteous Offspring",  categories: ['provision'] },
  { id: 34, surah: 59, ayah: 10,  topic: "Forgiveness for All Believers",    categories: ['forgiveness'] },
  { id: 35, surah: 60, ayah: 4,   topic: "Trust in Allah",                   categories: ['peace'] },
  { id: 36, surah: 60, ayah: 5,   topic: "Protection from Fitnah",           categories: ['peace'] },
  { id: 37, surah: 66, ayah: 8,   topic: "Light & Forgiveness",              categories: ['forgiveness'] },
  { id: 38, surah: 2,  ayah: 286, topic: "Ease, Forgiveness & Pardon",        categories: ['forgiveness', 'healing', 'peace'] },
  { id: 40, surah: 3,  ayah: 38,  topic: "Righteous Children",               categories: ['provision'] },
];
