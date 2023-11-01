const Paciente = require("../models/PacienteModel");
const { agendaMedicamento } = require("../models/AgendamentoModel");
const schedule = require("node-schedule");

exports.postMedicamento = async (req, res) => {
  const { pacienteId } = req.params;
  const medicamentos = await Paciente.getMedicamentos(pacienteId);

  const scheduleList = schedule.scheduledJobs; //lista dos agendamentos do servidor

  try {
    for (let medicamento of medicamentos) {
      //checando se já tem um agendamento com esse id
      if (!scheduleList[medicamento.medicamentoId]) {
        const dadosMedicamento = {
          medicamentoId: medicamento.medicamentoId,
          dataInicio: medicamento.inicio,
          duracao: medicamento.duracao_valor,
          duracaoT: medicamento.duracao_tipo,
          frequencia: medicamento.frequencia_valor,
          frequenciaT: medicamento.frequencia_tipo,
          alarme: medicamento.alarme,
          nome: medicamento.nome,
          dosagem: medicamento.dosagem,
          via: medicamento.via,
          medida: medicamento.medida,
        };
        await agendaMedicamento(pacienteId, dadosMedicamento);
      }
    }
  } catch (err) {
    res.status(400).json();
  }

  console.log(scheduleList);
  res.status(201).json();
};

exports.deleteMedicamento = (req, res) => {
  const { medicamentoId } = req.params;
  const alarmeScheduleId = `${medicamentoId}-2`;

  const scheduleList = schedule.scheduledJobs;

  if (scheduleList[medicamentoId]) {
    const scheduleMedicamento = scheduleList[medicamentoId];
    scheduleMedicamento.cancel();

    const scheduleAlarme = scheduleList[alarmeScheduleId];
    scheduleAlarme.cancel();
    res.status(204).json();
  } else {
    res.status(400).json();
  }
};
