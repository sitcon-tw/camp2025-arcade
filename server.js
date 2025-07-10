const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use('/arcade', express.static('public'))

app.use(express.json());

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});