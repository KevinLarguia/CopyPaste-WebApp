const { aplicarCosteo } = require('./_lib/costeo');
exports.handler = require('./_lib/crud').makeHandler('ventas', 'v', { beforeSave: aplicarCosteo });
