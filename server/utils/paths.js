const path = require('path');

const abs = (p) => path.join(__dirname, '..', p);

module.exports = {
  uploadsDir: abs('uploads')
};