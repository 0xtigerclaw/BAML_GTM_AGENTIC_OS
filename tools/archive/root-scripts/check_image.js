
const fs = require('fs');
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/generated/ive_design_1769983042441.png',
    method: 'HEAD'
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
