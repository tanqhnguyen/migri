module.exports = [
  {
    depends: null,
    version: 'product_1',
    query() {
      return 'product_1';
    },
  },
  {
    depends: 'product_1',
    version: 'product_2',
    query() {
      return 'product_2';
    },
  },
  {
    depends: 'product_2',
    version: 'product_3',
    query() {
      return 'product_3';
    },
  },
  {
    depends: ['product_2', 'product_3'],
    version: 'product_4',
    query() {
      return 'product_4';
    },
  },
];
