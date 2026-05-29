"use strict";

// DIAGNOSTIC: minimal handler to test function execution
module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, method: req.method }),
  };
};
