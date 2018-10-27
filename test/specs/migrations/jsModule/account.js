module.exports = [
  {
    depends: null,
    version: 'account_1',
    query() {
      return 'account_1';
    },
  },
  {
    depends: 'account_1',
    version: 'account_2',
    query() {
      return 'account_2';
    },
  },
];
