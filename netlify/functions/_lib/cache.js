// Cache trivial a nivel modulo. Vive mientras vive el contenedor.
const store = new Map();
module.exports = {
  get: (k) => store.get(k),
  set: (k, v) => store.set(k, v),
  clear: () => store.clear(),
};
