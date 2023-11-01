const express = require("express");
require("dotenv").config(); //utilizando o dotenv para variáveis de ambiente
const routes = require("./routes");

const app = express();

app.use(express.json()); //permitindo compatibilidade com json

//usando o arquivo de rotas
app.use(routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server is running on http://localhost:${PORT}`);
});
