module.exports = [
  {
    depends: null,
    version: 'arango_test_collection_1',
    query(db) {
      return db.collection('arango_test_collection').create();
    },
  },
];
