const express = require("express");
const PacienteController = require("./src/controllers/PacienteController");

const router = express.Router();

//POST: Medicamento
router.post("/medicamento/:pacienteId", PacienteController.postMedicamento);

//DELETE: Medicamento
router.delete(
  "/medicamento/:medicamentoId",
  PacienteController.deleteMedicamento
);

module.exports = router;
