// Envolve um handler assíncrono de rota do Express: se a Promise rejeitar,
// encaminha o erro pro next() em vez de derrubar o processo (Express 4 não
// faz isso sozinho para handlers async).
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
