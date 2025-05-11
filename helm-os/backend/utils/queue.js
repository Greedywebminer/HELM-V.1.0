const PQueueModule = require('p-queue');
const PQueue = PQueueModule.default || PQueueModule; // handles both styles
const queue = new PQueue({ concurrency: 10 });


function runLimited(taskFn) {
  return queue.add(taskFn);
}

function wrapAsync(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

module.exports = {
  runLimited,
  wrapAsync
};

