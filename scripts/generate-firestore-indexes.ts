import { writeFileSync } from 'node:fs';
const filters = ['data.nationality', 'data.city', 'data.education', 'data.specialty', 'status'];
const indexes = [];
// Firestore merges equality indexes for combined filters. Include array+sort indexes.
for (const direction of ['ASCENDING', 'DESCENDING']) {
  for (const fieldPath of filters)
    indexes.push({
      collectionGroup: 'minassati_applications',
      queryScope: 'COLLECTION',
      fields: [
        { fieldPath, order: 'ASCENDING' },
        { fieldPath: 'created_at', order: direction },
      ],
    });
  indexes.push({
    collectionGroup: 'minassati_applications',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'search_tokens', arrayConfig: 'CONTAINS' },
      { fieldPath: 'created_at', order: direction },
    ],
  });
}
const fieldOverrides = [
  'data.skills',
  'data.notes',
  'data.lastJob',
  'data.otherSpecialty',
  'payload_hash',
].map((fieldPath) => ({ collectionGroup: 'minassati_applications', fieldPath, indexes: [] }));
writeFileSync(
  'firestore.indexes.json',
  JSON.stringify({ indexes, fieldOverrides }, null, 2) + '\n',
);
